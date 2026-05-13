import { Client, Connection, WorkflowHandle } from "@temporalio/client";
import {
  SupportEscalationWorkflow,
  PlaybookGenerationWorkflow,
  type PlaybookGenerationResult,
} from "./workflows";
import type { SupportEscalationInput, SupportEscalationState } from "./types";
import { env, buildTemporalUiUrl } from "../lib/env";

let cachedClient: Client | null = null;

export async function getClient(): Promise<Client> {
  if (cachedClient) return cachedClient;
  const connection = await Connection.connect({ address: env.temporalAddress });
  cachedClient = new Client({ connection, namespace: env.temporalNamespace });
  return cachedClient;
}

export interface StartWorkflowResult {
  workflowId: string;
  runId: string;
  temporalUiUrl: string;
}

export async function startSupportEscalation(
  input: SupportEscalationInput,
): Promise<StartWorkflowResult> {
  const client = await getClient();
  const workflowId = `support-${input.ticketId}-${Date.now()}`;

  const handle = await client.workflow.start(SupportEscalationWorkflow, {
    args: [input],
    taskQueue: env.temporalTaskQueue,
    workflowId,
  });

  return {
    workflowId: handle.workflowId,
    runId: handle.firstExecutionRunId,
    temporalUiUrl: buildTemporalUiUrl(handle.workflowId, handle.firstExecutionRunId),
  };
}

export async function runPlaybookGeneration(): Promise<{
  workflowId: string;
  runId: string;
  temporalUiUrl: string;
  result: PlaybookGenerationResult;
}> {
  const client = await getClient();
  const workflowId = `playbook-${Date.now()}`;
  const handle = await client.workflow.start(PlaybookGenerationWorkflow, {
    args: [],
    taskQueue: env.temporalTaskQueue,
    workflowId,
  });
  const result = await handle.result();
  return {
    workflowId: handle.workflowId,
    runId: handle.firstExecutionRunId,
    temporalUiUrl: buildTemporalUiUrl(handle.workflowId, handle.firstExecutionRunId),
    result,
  };
}

export async function queryWorkflowState(
  workflowId: string,
): Promise<SupportEscalationState | null> {
  const client = await getClient();
  const handle: WorkflowHandle = client.workflow.getHandle(workflowId);
  try {
    return await handle.query<SupportEscalationState>("currentCaseState");
  } catch (err) {
    console.warn(`[client] query failed for ${workflowId}:`, (err as Error).message);
    return null;
  }
}

export type SignalName =
  | "markExecVisible"
  | "changePriority"
  | "assignOwner"
  | "resolveCase"
  | "approveDraft"
  | "editDraft";

export async function signalWorkflow(
  workflowId: string,
  signal: SignalName,
  value?: unknown,
): Promise<void> {
  const client = await getClient();
  const handle = client.workflow.getHandle(workflowId);
  if (signal === "markExecVisible" || signal === "resolveCase" || signal === "approveDraft") {
    await handle.signal(signal);
  } else {
    await handle.signal(signal, value);
  }
}

export async function describeWorkflow(workflowId: string) {
  const client = await getClient();
  const handle = client.workflow.getHandle(workflowId);
  return handle.describe();
}
