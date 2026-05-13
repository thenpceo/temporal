export const env = {
  temporalAddress: process.env.TEMPORAL_ADDRESS || "localhost:7233",
  temporalNamespace: process.env.TEMPORAL_NAMESPACE || "default",
  temporalTaskQueue: process.env.TEMPORAL_TASK_QUEUE || "support-ops-demo",
  temporalUiBaseUrl: process.env.TEMPORAL_UI_BASE_URL || "http://localhost:8233",
  pylonApiKey: process.env.PYLON_API_KEY || "",
  pylonApiBaseUrl: process.env.PYLON_API_BASE_URL || "",
  salesforceInstanceUrl: process.env.SALESFORCE_INSTANCE_URL || "",
  slackWebhookUrl: process.env.SLACK_WEBHOOK_URL || "",
  bigQueryProjectId: process.env.BIGQUERY_PROJECT_ID || "",
  bigQueryDataset: process.env.BIGQUERY_DATASET || "support_ops_demo",
  bigQueryTable: process.env.BIGQUERY_TABLE || "events",
  useMocks: (process.env.USE_MOCKS ?? "true") !== "false",
};

export function buildTemporalUiUrl(workflowId: string, runId?: string): string {
  const base = `${env.temporalUiBaseUrl}/namespaces/${env.temporalNamespace}/workflows/${encodeURIComponent(
    workflowId,
  )}`;
  return runId ? `${base}/${encodeURIComponent(runId)}/history` : base;
}
