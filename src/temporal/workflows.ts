import {
  proxyActivities,
  defineSignal,
  defineQuery,
  setHandler,
  condition,
  executeChild,
  workflowInfo,
} from "@temporalio/workflow";
import type * as activities from "./activities";
import type {
  SupportEscalationInput,
  SupportEscalationState,
  TicketPriority,
  TriageInvestigationInput,
  InvestigationFindings,
} from "./types";

const {
  fetchPylonTicket,
  lookupSalesforceAccount,
  loadPlaybookContext,
  classifyEscalation,
  createOrUpdateSalesforceCase,
  postSlackEscalation,
  writeBigQueryEvent,
  drainBigQueryFailureNotes,
  draftCustomerReply,
  generatePlaybookActivity,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: "60 seconds",
  retry: {
    initialInterval: "2 seconds",
    maximumInterval: "30 seconds",
    maximumAttempts: 5,
    backoffCoefficient: 2,
  },
});

// Helper: write a BigQuery event AND pull back any retry notes the adapter
// recorded for failed attempts during this call. Each activity call is in
// its own worker process; this is the only way the workflow learns about
// in-activity retries.
async function writeBigQueryEventAndCaptureRetries(
  state: SupportEscalationState,
  eventType: string,
): Promise<string> {
  const id = await writeBigQueryEvent({ state, eventType });
  const notes = await drainBigQueryFailureNotes(state.workflowId);
  for (const note of notes) state.failureNotes.push(note);
  return id;
}

const { runInvestigation } = proxyActivities<typeof activities>({
  startToCloseTimeout: "3 minutes",
  retry: {
    initialInterval: "5 seconds",
    maximumInterval: "30 seconds",
    maximumAttempts: 2,
  },
});

export const markExecVisibleSignal = defineSignal("markExecVisible");
export const changePrioritySignal = defineSignal<[TicketPriority]>("changePriority");
export const assignOwnerSignal = defineSignal<[string]>("assignOwner");
export const resolveCaseSignal = defineSignal("resolveCase");
export const approveDraftSignal = defineSignal("approveDraft");
export const editDraftSignal = defineSignal<[string]>("editDraft");
export const currentCaseStateQuery = defineQuery<SupportEscalationState>("currentCaseState");

export async function SupportEscalationWorkflow(
  input: SupportEscalationInput,
): Promise<SupportEscalationState> {
  const state: SupportEscalationState = {
    workflowId: workflowInfo().workflowId,
    phase: "received",
    bigQueryEventIds: [],
    execVisible: false,
    failureNotes: [],
    resolved: false,
    playbookLoaded: false,
  };

  setHandler(currentCaseStateQuery, () => state);

  setHandler(markExecVisibleSignal, async () => {
    state.execVisible = true;
    await postSlackEscalation({ state, eventType: "exec_visible" });
    const eventId = await writeBigQueryEventAndCaptureRetries(state, "exec_visible");
    state.bigQueryEventIds.push(eventId);
  });

  setHandler(changePrioritySignal, async (priority) => {
    state.priorityOverride = priority;
    await postSlackEscalation({ state, eventType: "priority_changed" });
    const eventId = await writeBigQueryEventAndCaptureRetries(state, "priority_changed");
    state.bigQueryEventIds.push(eventId);
  });

  setHandler(assignOwnerSignal, (owner) => {
    state.assignedOwner = owner;
  });

  setHandler(resolveCaseSignal, () => {
    state.resolved = true;
    state.phase = "resolved";
  });

  setHandler(approveDraftSignal, async () => {
    if (!state.draftReply) return;
    state.draftReply.status = "approved";
    state.draftReply.approvedAt = new Date().toISOString();
    await postSlackEscalation({ state, eventType: "draft_approved" });
    const eventId = await writeBigQueryEventAndCaptureRetries(state, "draft_approved");
    state.bigQueryEventIds.push(eventId);
  });

  setHandler(editDraftSignal, (newContent) => {
    if (!state.draftReply) return;
    state.draftReply.editedContent = newContent;
    state.draftReply.status = "edited";
  });

  const playbookContext = await loadPlaybookContext();
  if (playbookContext) {
    state.playbookLoaded = true;
    state.playbookSummary = playbookContext.split("\n").slice(0, 2).join(" | ");
  }

  state.ticket = await fetchPylonTicket(input.ticketId);
  state.phase = "enriched";

  state.account = await lookupSalesforceAccount(state.ticket.requesterEmail);

  const classifyResult = await classifyEscalation({
    ticket: state.ticket,
    account: state.account,
    playbookContext,
  });
  state.classification = classifyResult.classification;
  state.classificationSource = classifyResult.source;
  state.phase = "classified";

  state.salesforceCaseId = await createOrUpdateSalesforceCase({ state });
  state.phase = "case_created";

  state.slackThreadUrl = await postSlackEscalation({
    state,
    eventType: "new_escalation",
  });
  state.phase = "notified";

  const startEventId = await writeBigQueryEventAndCaptureRetries(state, "workflow_started");
  state.bigQueryEventIds.push(startEventId);

  let investigation: InvestigationFindings | undefined;
  if (state.classification.riskLabel === "executive" || state.classification.riskLabel === "urgent") {
    state.phase = "investigating";
    investigation = await executeChild(TriageInvestigationWorkflow, {
      args: [
        {
          parentWorkflowId: state.workflowId,
          ticket: state.ticket,
          account: state.account,
          classification: state.classification,
        },
      ],
      workflowId: `triage-${state.workflowId}`,
    });
    state.investigation = investigation;
    const investEventId = await writeBigQueryEventAndCaptureRetries(state, "investigation_complete");
    state.bigQueryEventIds.push(investEventId);
  }

  state.phase = "drafting_reply";
  state.draftReply = await draftCustomerReply({
    ticket: state.ticket,
    account: state.account,
    classification: state.classification,
    investigation: investigation?.findings,
  });
  const draftEventId = await writeBigQueryEventAndCaptureRetries(state, "draft_generated");
  state.bigQueryEventIds.push(draftEventId);

  state.phase = "awaiting_approval";
  await condition(
    () => state.draftReply?.status === "approved" || state.resolved,
    "30 minutes",
  );

  state.phase = "waiting_for_resolution";
  await condition(() => state.resolved);

  const resolvedEventId = await writeBigQueryEventAndCaptureRetries(state, "workflow_resolved");
  state.bigQueryEventIds.push(resolvedEventId);

  return state;
}

export async function TriageInvestigationWorkflow(
  input: TriageInvestigationInput,
): Promise<InvestigationFindings> {
  const findings = await runInvestigation({
    ticket: input.ticket,
    account: input.account,
    classification: input.classification,
  });
  return { ...findings, childWorkflowId: workflowInfo().workflowId };
}

export interface PlaybookGenerationResult {
  basedOnEvents: number;
  source: "llm" | "mock";
  summary: string;
  entries: number;
  generatedAt: string;
}

export async function PlaybookGenerationWorkflow(): Promise<PlaybookGenerationResult> {
  const result = await generatePlaybookActivity();
  return { ...result, generatedAt: new Date().toISOString() };
}
