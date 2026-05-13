export interface RecentWorkflow {
  workflowId: string;
  runId: string;
  ticketId: string;
  startedAt: string;
  temporalUiUrl: string;
}

const globalAny = globalThis as unknown as { __recentWorkflows?: RecentWorkflow[] };

if (!globalAny.__recentWorkflows) {
  globalAny.__recentWorkflows = [];
}

export function recordWorkflow(entry: RecentWorkflow): void {
  globalAny.__recentWorkflows!.unshift(entry);
  if (globalAny.__recentWorkflows!.length > 25) {
    globalAny.__recentWorkflows!.length = 25;
  }
}

export function listWorkflows(): RecentWorkflow[] {
  return [...(globalAny.__recentWorkflows ?? [])];
}

export function clearWorkflows(): number {
  const n = globalAny.__recentWorkflows?.length ?? 0;
  globalAny.__recentWorkflows = [];
  return n;
}
