import { promises as fs } from "node:fs";
import path from "node:path";
import type { SupportEscalationState } from "../temporal/types";
import { env } from "../lib/env";

const SENTINEL_PATH = path.join(process.cwd(), ".bigquery-fail-next");

const eventLog: Array<{
  id: string;
  at: string;
  eventType: string;
  workflowId: string;
  payload: Record<string, unknown>;
}> = [];

async function consumeFailureSentinel(): Promise<boolean> {
  try {
    await fs.access(SENTINEL_PATH);
    await fs.unlink(SENTINEL_PATH);
    return true;
  } catch {
    return false;
  }
}

export async function armBigQueryFailure(): Promise<void> {
  await fs.writeFile(SENTINEL_PATH, new Date().toISOString());
}

export async function isBigQueryArmed(): Promise<boolean> {
  try {
    await fs.access(SENTINEL_PATH);
    return true;
  } catch {
    return false;
  }
}

export function getBigQueryEvents(): ReadonlyArray<{
  id: string;
  at: string;
  eventType: string;
  workflowId: string;
  payload: Record<string, unknown>;
}> {
  return eventLog;
}

export async function insertBigQueryEvent(
  state: SupportEscalationState,
  eventType: string,
): Promise<string> {
  const shouldFail = await consumeFailureSentinel();
  if (shouldFail) {
    state.failureNotes.push(
      `BigQuery write failed once for event "${eventType}" at ${new Date().toISOString()}. Temporal will retry.`,
    );
    throw new Error(`Injected BigQuery failure for event "${eventType}"`);
  }

  const id = `bq-evt-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const record = {
    id,
    at: new Date().toISOString(),
    eventType,
    workflowId: state.workflowId,
    payload: {
      phase: state.phase,
      execVisible: state.execVisible,
      assignedOwner: state.assignedOwner ?? null,
      priorityOverride: state.priorityOverride ?? null,
      riskScore: state.classification?.riskScore ?? null,
      riskLabel: state.classification?.riskLabel ?? null,
      ticketId: state.ticket?.id ?? null,
      accountId: state.account?.id ?? null,
      salesforceCaseId: state.salesforceCaseId ?? null,
    },
  };

  if (env.bigQueryProjectId && !env.useMocks) {
    console.log(
      `[bigquery] would write to ${env.bigQueryProjectId}.${env.bigQueryDataset}.${env.bigQueryTable}:`,
      record,
    );
  }

  eventLog.push(record);
  return id;
}
