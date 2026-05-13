import { getPylonTicket } from "../adapters/pylon";
import { getSalesforceAccountByEmail, upsertSalesforceCase } from "../adapters/salesforce";
import { sendSlackEscalation } from "../adapters/slack";
import { insertBigQueryEvent, getBigQueryEvents } from "../adapters/bigquery";
import {
  classifyTicketWithLLM,
  draftCustomerReply as llmDraftCustomerReply,
  runInvestigation as llmRunInvestigation,
  clusterIntoPlaybook,
  getPlaybookContextForWorkflow,
} from "../lib/llm";
import { savePlaybook, loadPlaybook } from "../lib/playbook";
import type {
  PylonTicket,
  SalesforceAccount,
  EscalationClassification,
  SupportEscalationState,
  InvestigationFindings,
  DraftReply,
} from "./types";

export async function fetchPylonTicket(ticketId: string): Promise<PylonTicket> {
  return getPylonTicket(ticketId);
}

export async function lookupSalesforceAccount(email: string): Promise<SalesforceAccount> {
  return getSalesforceAccountByEmail(email);
}

export async function loadPlaybookContext(): Promise<string | undefined> {
  return getPlaybookContextForWorkflow();
}

export async function classifyEscalation(input: {
  ticket: PylonTicket;
  account: SalesforceAccount;
  playbookContext?: string;
}): Promise<{ classification: EscalationClassification; source: "llm" | "mock" }> {
  const result = await classifyTicketWithLLM(input);
  return { classification: result.classification, source: result.usage.source };
}

export async function createOrUpdateSalesforceCase(input: {
  state: SupportEscalationState;
}): Promise<string> {
  return upsertSalesforceCase(input.state);
}

export async function postSlackEscalation(input: {
  state: SupportEscalationState;
  eventType: string;
}): Promise<string> {
  return sendSlackEscalation(input.state, input.eventType);
}

export async function writeBigQueryEvent(input: {
  state: SupportEscalationState;
  eventType: string;
}): Promise<string> {
  return insertBigQueryEvent(input.state, input.eventType);
}

export async function runInvestigation(input: {
  ticket: PylonTicket;
  account: SalesforceAccount;
  classification: EscalationClassification;
}): Promise<InvestigationFindings> {
  const events = getBigQueryEvents().slice(-50);
  const result = await llmRunInvestigation({ ...input, recentEvents: [...events] });
  return {
    findings: result.findings,
    toolCalls: result.toolCalls,
    toolCallDetails: result.toolCallDetails,
    durationMs: result.durationMs,
    source: result.usage.source,
  };
}

export async function draftCustomerReply(input: {
  ticket: PylonTicket;
  account: SalesforceAccount;
  classification: EscalationClassification;
  investigation?: string;
}): Promise<DraftReply> {
  const result = await llmDraftCustomerReply(input);
  return {
    content: result.reply,
    status: "pending",
    source: result.usage.source,
  };
}

export async function generatePlaybookActivity(): Promise<{
  basedOnEvents: number;
  source: "llm" | "mock";
  summary: string;
  entries: number;
}> {
  const events = getBigQueryEvents();
  const result = await clusterIntoPlaybook({ events: [...events] });
  await savePlaybook(result.playbook);
  return {
    basedOnEvents: result.playbook.basedOnEvents,
    source: result.usage.source,
    summary: result.playbook.summary,
    entries: result.playbook.entries.length,
  };
}

export async function readPlaybook() {
  return loadPlaybook();
}
