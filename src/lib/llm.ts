import Anthropic from "@anthropic-ai/sdk";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import type {
  PylonTicket,
  SalesforceAccount,
  EscalationClassification,
  ToolCallRecord,
} from "../temporal/types";
import { loadPlaybookText, type SignalAudience } from "./playbook";

const MODEL = "claude-opus-4-7";

function getClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  return new Anthropic();
}

const ClassificationSchema = z.object({
  riskScore: z.number().min(0).max(150),
  riskLabel: z.enum(["normal", "watch", "urgent", "executive"]),
  reason: z.string(),
  recommendedOwner: z.string(),
  recommendedAction: z.string(),
});

export interface LLMUsage {
  source: "llm" | "mock";
  inputTokens?: number;
  outputTokens?: number;
  cacheReadTokens?: number;
}

export interface ClassifyResult {
  classification: EscalationClassification;
  usage: LLMUsage;
}

export async function classifyTicketWithLLM(input: {
  ticket: PylonTicket;
  account: SalesforceAccount;
  playbookContext?: string;
}): Promise<ClassifyResult> {
  const client = getClient();
  if (!client) {
    return { classification: ruleClassify(input), usage: { source: "mock" } };
  }

  const playbookSection = input.playbookContext
    ? `\n\n<playbook>\n${input.playbookContext}\n</playbook>\n\nIf the playbook describes a similar pattern, weight your classification toward the playbook's recommendation.`
    : "";

  const systemPrompt =
    `You are a support ops triage classifier for Temporal. Score escalation risk for inbound support tickets.\n\n` +
    `Risk score 0-150. Labels:\n` +
    `- normal (<50): routine, route to support owner\n` +
    `- watch (50-69): elevated SLA risk, monitor\n` +
    `- urgent (70-89): page on-call, hold triage huddle\n` +
    `- executive (>=90): exec-visible, assign owner, customer-facing timeline\n\n` +
    `Heavily weight: enterprise/strategic tier, open renewal, tight SLA, critical/high priority, production impact on workflow execution.${playbookSection}`;

  const userPrompt =
    `Ticket:\n` +
    `- Customer: ${input.ticket.customerName}\n` +
    `- Subject: ${input.ticket.subject}\n` +
    `- Body: ${input.ticket.body}\n` +
    `- Priority: ${input.ticket.priority}\n` +
    `- SLA remaining: ${input.ticket.slaMinutesRemaining} minutes\n\n` +
    `Account:\n` +
    `- Tier: ${input.account.tier}\n` +
    `- ARR band: ${input.account.arrBand}\n` +
    `- Owner: ${input.account.owner}\n` +
    `- Open opportunity: ${input.account.openOpportunity ? "yes" : "no"}\n` +
    `- Renewal: ${input.account.renewalDate ?? "n/a"}\n\n` +
    `Classify this escalation.`;

  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 1024,
    thinking: { type: "adaptive" },
    output_config: {
      effort: "medium",
      format: {
        type: "json_schema",
        schema: {
          type: "object",
          properties: {
            riskScore: { type: "integer" },
            riskLabel: { type: "string", enum: ["normal", "watch", "urgent", "executive"] },
            reason: { type: "string" },
            recommendedOwner: { type: "string" },
            recommendedAction: { type: "string" },
          },
          required: ["riskScore", "riskLabel", "reason", "recommendedOwner", "recommendedAction"],
          additionalProperties: false,
        },
      },
    },
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const parsed = ClassificationSchema.parse(response.parsed_output);
  return {
    classification: parsed,
    usage: {
      source: "llm",
      inputTokens: response.usage?.input_tokens,
      outputTokens: response.usage?.output_tokens,
      cacheReadTokens: response.usage?.cache_read_input_tokens ?? undefined,
    },
  };
}

export interface DraftResult {
  reply: string;
  usage: LLMUsage;
}

export async function draftCustomerReply(input: {
  ticket: PylonTicket;
  account: SalesforceAccount;
  classification: EscalationClassification;
  investigation?: string;
}): Promise<DraftResult> {
  const client = getClient();
  if (!client) {
    return { reply: ruleDraft(input), usage: { source: "mock" } };
  }

  const systemPrompt =
    `You draft customer-facing replies for Temporal support escalations. ` +
    `Tone: warm but professional, accountable, specific. Skip preamble. ` +
    `Acknowledge the impact, state what we're doing right now, and give a clear next-update time. ` +
    `4-6 sentences. No marketing fluff. Sign off as the assigned owner.`;

  const investigationSection = input.investigation
    ? `\n\nInternal investigation summary (do not quote verbatim, but reflect the findings):\n${input.investigation}`
    : "";

  const userPrompt =
    `Customer: ${input.ticket.customerName}\n` +
    `Issue: ${input.ticket.subject}\n` +
    `Detail: ${input.ticket.body}\n` +
    `SLA remaining: ${input.ticket.slaMinutesRemaining} min\n` +
    `Risk label: ${input.classification.riskLabel}\n` +
    `Owner: ${input.classification.recommendedOwner}${investigationSection}\n\n` +
    `Draft the reply.`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 800,
    thinking: { type: "adaptive" },
    output_config: { effort: "low" },
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  return {
    reply: text,
    usage: {
      source: "llm",
      inputTokens: response.usage?.input_tokens,
      outputTokens: response.usage?.output_tokens,
    },
  };
}

export interface InvestigationResult {
  findings: string;
  toolCalls: number;
  toolCallDetails: ToolCallRecord[];
  durationMs: number;
  usage: LLMUsage;
}

export async function runInvestigation(input: {
  ticket: PylonTicket;
  account: SalesforceAccount;
  classification: EscalationClassification;
  recentEvents: Array<{ at: string; eventType: string; workflowId: string; payload: unknown }>;
}): Promise<InvestigationResult> {
  const client = getClient();
  const startedAt = Date.now();
  const toolCallDetails: ToolCallRecord[] = [];

  if (!client) {
    return {
      ...heuristicInvestigation(input),
      usage: { source: "mock" },
    };
  }

  const recordTool = async <T>(
    name: string,
    args: Record<string, string>,
    fn: () => Promise<T>,
  ): Promise<T> => {
    const t0 = Date.now();
    const result = await fn();
    const str =
      typeof result === "string" ? result : JSON.stringify(result, null, 2);
    toolCallDetails.push({
      name,
      args,
      result: str,
      durationMs: Date.now() - t0,
    });
    return result;
  };

  const inspectWorkflowCode = betaZodTool({
    name: "inspect_customer_workflow_code",
    description:
      "Inspect the customer's workflow code repo for recent changes that could correlate with the issue. Returns recent commits, suspicious changes (retry policy, timeout, activity duration), and PR links.",
    inputSchema: z.object({
      accountSlug: z.string().describe("Customer account slug, e.g. acme-ai"),
      since: z.string().describe("Lookback window, e.g. '24h' or '7d'"),
    }),
    run: async (args) =>
      recordTool("inspect_customer_workflow_code", args, async () =>
        mockInspectWorkflowCode(input),
      ),
  });

  const checkWorkerHealth = betaZodTool({
    name: "check_worker_health",
    description:
      "Check Temporal worker fleet metrics for the customer's namespace: worker count, poll latency, task slot saturation, SDK version matrix, panic counts.",
    inputSchema: z.object({
      namespace: z.string(),
      lookback: z.string().describe("e.g. '2h'"),
    }),
    run: async (args) =>
      recordTool("check_worker_health", args, async () => mockWorkerHealth(input)),
  });

  const checkClusterHealth = betaZodTool({
    name: "check_temporal_cluster_health",
    description:
      "Check Temporal cluster-side health for the customer's namespace: history shard latency, frontend service health, known incidents, replication status.",
    inputSchema: z.object({
      namespace: z.string(),
      since: z.string().describe("e.g. '12h'"),
    }),
    run: async (args) =>
      recordTool("check_temporal_cluster_health", args, async () =>
        mockClusterHealth(),
      ),
  });

  const correlateWithSdkReleases = betaZodTool({
    name: "correlate_with_sdk_releases",
    description:
      "Match the customer's SDK version against recent Temporal SDK releases and known issues.",
    inputSchema: z.object({
      sdkVersion: z.string().describe("e.g. typescript-1.8.2"),
      since: z.string().describe("e.g. 7d"),
    }),
    run: async (args) =>
      recordTool("correlate_with_sdk_releases", args, async () =>
        mockSdkReleases(input),
      ),
  });

  const queryPastEscalations = betaZodTool({
    name: "query_past_escalations",
    description:
      "Search past escalations from other Temporal customers for similar symptom/pattern matches. Returns top N analogous cases and their resolutions.",
    inputSchema: z.object({
      symptom: z.string(),
      pattern: z.string(),
    }),
    run: async (args) =>
      recordTool("query_past_escalations", args, async () =>
        mockPastEscalations(input),
      ),
  });

  const lookupRunbook = betaZodTool({
    name: "lookup_runbook",
    description:
      "Returns the runbook for a known incident pattern, or 'no runbook' if none matches.",
    inputSchema: z.object({ pattern: z.string() }),
    run: async (args) =>
      recordTool("lookup_runbook", args, async () => mockRunbook(args.pattern)),
  });

  const systemPrompt =
    `You are a Temporal support ops investigator. Acme AI (a Temporal customer) has reported a production issue.\n\n` +
    `You have 6 tools to gather evidence. Call each at least once. Then produce a 4-bullet findings summary.\n\n` +
    `Order of investigation:\n` +
    `1. inspect_customer_workflow_code — has the customer changed something recently?\n` +
    `2. check_worker_health — are their workers healthy?\n` +
    `3. check_temporal_cluster_health — is Temporal itself healthy in their namespace?\n` +
    `4. correlate_with_sdk_releases — known SDK issues?\n` +
    `5. query_past_escalations — has anyone else hit this pattern?\n` +
    `6. lookup_runbook — is there an existing runbook?\n\n` +
    `After all tool calls, output exactly this format:\n` +
    `- ROOT CAUSE HYPOTHESIS: ...\n` +
    `- BLAST RADIUS: ...\n` +
    `- RECOMMENDED OWNER ACTION: ...\n` +
    `- CUSTOMER MESSAGING ANGLE: ...\n\n` +
    `Be specific. Reference the tool outputs. No preamble.`;

  const userPrompt =
    `Investigate this escalation:\n\n` +
    `Customer: ${input.account.name} (${input.account.tier}, ${input.account.arrBand})\n` +
    `Issue: ${input.ticket.subject}\n` +
    `Detail: ${input.ticket.body}\n` +
    `SLA: ${input.ticket.slaMinutesRemaining} min remaining\n` +
    `Classification: ${input.classification.riskLabel} (score ${input.classification.riskScore})\n\n` +
    `Use your tools, then return the findings summary.`;

  const finalMessage = await client.beta.messages.toolRunner({
    model: MODEL,
    max_tokens: 6144,
    thinking: { type: "adaptive" },
    output_config: { effort: "high" },
    tools: [
      inspectWorkflowCode,
      checkWorkerHealth,
      checkClusterHealth,
      correlateWithSdkReleases,
      queryPastEscalations,
      lookupRunbook,
    ],
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const findings = finalMessage.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  return {
    findings: findings || "Investigation produced no findings text.",
    toolCalls: toolCallDetails.length,
    toolCallDetails,
    durationMs: Date.now() - startedAt,
    usage: {
      source: "llm",
      inputTokens: finalMessage.usage?.input_tokens,
      outputTokens: finalMessage.usage?.output_tokens,
    },
  };
}

const SignalRoutingSchema = z.object({
  audience: z.enum(["product", "enablement", "ops"]),
  team: z.string(),
  channel: z.string(),
  artifact: z.string(),
});

const PlaybookEntrySchema = z.object({
  pattern: z.string(),
  signals: z.array(z.string()),
  signalsFor: z.array(z.enum(["product", "enablement", "ops"])).optional(),
  recommendedAction: z.string(),
  recommendedRouting: z.string().optional(),
  confidence: z.enum(["low", "medium", "high"]),
  routings: z.array(SignalRoutingSchema).optional(),
});

export interface Playbook {
  generatedAt: string;
  basedOnEvents: number;
  entries: Array<ReturnType<typeof normalizePlaybookEntry>>;
  summary: string;
}

export interface PlaybookResult {
  playbook: Playbook;
  usage: LLMUsage;
}

export async function clusterIntoPlaybook(input: {
  events: Array<{ at: string; eventType: string; workflowId: string; payload: unknown }>;
}): Promise<PlaybookResult> {
  const client = getClient();
  const basedOnEvents = input.events.length;

  if (!client || basedOnEvents === 0) {
    return {
      playbook: heuristicPlaybook(basedOnEvents),
      usage: { source: "mock" },
    };
  }

  const systemPrompt =
    `You analyze past Temporal support escalation events and extract recurring patterns into a playbook ` +
    `that future escalation classifications can load as context. Be specific and grounded in the events shown. ` +
    `Return 1-4 entries. Skip generic advice.\n\n` +
    `For each pattern, set 'recommendedAction' for the ops team (what Support does next time). ` +
    `Set 'signalsFor' to every audience this pattern should inform: product, enablement, and/or ops. ` +
    `Set 'recommendedRouting' to a single crisp "Team — artifact" line suitable for a hiring manager to skim. ` +
    `Additionally, identify whether the pattern carries a **product** or **enablement** signal:\n` +
    `- Product signal: the pattern points to a fix Temporal Eng should ship — SDK warning, UI surface, cluster-side metric, etc. Route product signals to #product-feedback.\n` +
    `- Enablement signal: the pattern points to a docs/onboarding gap — a missing best-practices page, a guide customers don't know about. Route to Developer Relations / Docs.\n` +
    `- Ops signal: internal process change only. No external artifact.\n\n` +
    `For each non-ops signal, populate the 'routings' array with concrete team, channel, and the specific artifact (e.g. 'SDK startup warning when startToCloseTimeout < p99 activity duration'). ` +
    `An entry can have 0, 1, or 2 routings.`;

  const userPrompt =
    `Past escalation events (newest first):\n\n` +
    input.events
      .slice(0, 100)
      .map((e) => `${e.at} | ${e.eventType} | ${JSON.stringify(e.payload)}`)
      .join("\n") +
    `\n\nExtract recurring patterns and produce the playbook.`;

  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 2048,
    thinking: { type: "adaptive" },
    output_config: {
      effort: "medium",
      format: {
        type: "json_schema",
        schema: {
          type: "object",
          properties: {
            summary: { type: "string" },
            entries: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  pattern: { type: "string" },
                  signals: { type: "array", items: { type: "string" } },
                  signalsFor: {
                    type: "array",
                    items: { type: "string", enum: ["product", "enablement", "ops"] },
                  },
                  recommendedAction: { type: "string" },
                  recommendedRouting: { type: "string" },
                  confidence: { type: "string", enum: ["low", "medium", "high"] },
                  routings: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        audience: { type: "string", enum: ["product", "enablement", "ops"] },
                        team: { type: "string" },
                        channel: { type: "string" },
                        artifact: { type: "string" },
                      },
                      required: ["audience", "team", "channel", "artifact"],
                      additionalProperties: false,
                    },
                  },
                },
                required: [
                  "pattern",
                  "signals",
                  "signalsFor",
                  "recommendedAction",
                  "recommendedRouting",
                  "confidence",
                ],
                additionalProperties: false,
              },
            },
          },
          required: ["summary", "entries"],
          additionalProperties: false,
        },
      },
    },
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  if (!response.parsed_output) {
    return { playbook: heuristicPlaybook(basedOnEvents), usage: { source: "mock" } };
  }
  const parsed = response.parsed_output as { summary: string; entries: unknown[] };
  const entries = ensureSignalCoverage(
    parsed.entries.map((e) => normalizePlaybookEntry(PlaybookEntrySchema.parse(e))),
    basedOnEvents,
  );
  const summary =
    entries.length > parsed.entries.length
      ? `${parsed.summary} Starter product and enablement routings are included until there is enough closed-case history to rank patterns by frequency.`
      : parsed.summary;

  return {
    playbook: {
      generatedAt: new Date().toISOString(),
      basedOnEvents,
      entries,
      summary,
    },
    usage: {
      source: "llm",
      inputTokens: response.usage?.input_tokens,
      outputTokens: response.usage?.output_tokens,
    },
  };
}

function normalizePlaybookEntry(entry: z.infer<typeof PlaybookEntrySchema>) {
  const routings = (entry.routings ?? []).map((routing) =>
    routing.audience === "product"
      ? { ...routing, channel: "#product-feedback" }
      : routing,
  );
  const signalsFor = uniqueAudiences([
    ...(entry.signalsFor ?? []),
    ...routings.map((routing) => routing.audience),
  ]);
  const normalizedSignalsFor: SignalAudience[] =
    signalsFor.length > 0 ? signalsFor : ["ops"];
  const recommendedRouting =
    entry.recommendedRouting ??
    buildRecommendedRouting(routings, entry.recommendedAction);

  return {
    ...entry,
    signalsFor: normalizedSignalsFor,
    recommendedRouting,
    routings,
  };
}

function ensureSignalCoverage(
  entries: Array<ReturnType<typeof normalizePlaybookEntry>>,
  basedOnEvents: number,
): Array<ReturnType<typeof normalizePlaybookEntry>> {
  const hasProduct = entries.some((entry) => entry.signalsFor.includes("product"));
  const hasEnablement = entries.some((entry) => entry.signalsFor.includes("enablement"));
  if (hasProduct && hasEnablement) return entries;

  const starterEntries = heuristicPlaybook(basedOnEvents).entries;
  const additions = starterEntries
    .map((entry) => normalizePlaybookEntry(PlaybookEntrySchema.parse(entry)))
    .filter((entry) => {
      if (!hasProduct && entry.signalsFor.includes("product")) return true;
      if (!hasEnablement && entry.signalsFor.includes("enablement")) return true;
      return false;
    });

  const existingPatterns = new Set(entries.map((entry) => entry.pattern));
  return [
    ...entries,
    ...additions.filter((entry) => !existingPatterns.has(entry.pattern)),
  ].slice(0, 4);
}

function buildRecommendedRouting(
  routings: Array<z.infer<typeof SignalRoutingSchema>>,
  fallbackAction: string,
): string {
  const externalRouting =
    routings.find((routing) => routing.audience === "product") ??
    routings.find((routing) => routing.audience === "enablement") ??
    routings[0];
  if (!externalRouting) return `Support Ops — ${fallbackAction}`;
  return `${externalRouting.team} — ${externalRouting.artifact}`;
}

function uniqueAudiences(input: SignalAudience[]): SignalAudience[] {
  const order = ["product", "enablement", "ops"] as const;
  return order.filter((audience) => input.includes(audience));
}

export async function getPlaybookContextForWorkflow(): Promise<string | undefined> {
  return loadPlaybookText();
}

// ─── Rule-based fallbacks (used when ANTHROPIC_API_KEY is absent) ──────────

function ruleClassify(input: {
  ticket: PylonTicket;
  account: SalesforceAccount;
}): EscalationClassification {
  let riskScore = 30;
  if (input.ticket.priority === "critical") riskScore += 40;
  if (input.ticket.priority === "high") riskScore += 25;
  if (input.ticket.slaMinutesRemaining <= 60) riskScore += 25;
  if (input.account.tier === "enterprise") riskScore += 20;
  if (input.account.tier === "strategic") riskScore += 30;
  if (input.account.openOpportunity) riskScore += 15;

  const riskLabel: EscalationClassification["riskLabel"] =
    riskScore >= 90 ? "executive" : riskScore >= 70 ? "urgent" : riskScore >= 50 ? "watch" : "normal";

  return {
    riskScore,
    riskLabel,
    reason: `${input.account.tier} account with ${input.ticket.slaMinutesRemaining} minutes remaining on SLA${input.account.openOpportunity ? " and open renewal opportunity" : ""}.`,
    recommendedOwner: input.account.owner || "Support Ops",
    recommendedAction:
      riskLabel === "executive"
        ? "Create exec-visible escalation, assign owner, and update customer-facing timeline."
        : riskLabel === "urgent"
          ? "Page on-call CSM, hold a triage huddle, and confirm SLA owner."
          : "Route to support owner and monitor SLA timer.",
  };
}

function ruleDraft(input: {
  ticket: PylonTicket;
  account: SalesforceAccount;
  classification: EscalationClassification;
  investigation?: string;
}): string {
  const owner = input.classification.recommendedOwner.split(",")[0];
  return [
    `Hi team at ${input.account.name},`,
    ``,
    `Thanks for flagging the ${input.ticket.subject.toLowerCase()}. We see this hitting your production pipeline and we're treating it as a ${input.classification.riskLabel} escalation.`,
    ``,
    `Our on-call has already pulled the relevant traces, opened a Salesforce case, and aligned the platform team. ${input.investigation ? "Initial investigation correlates this to a recent retry-policy change in your workflow code; we are validating against your namespace metrics now." : "We are validating root cause now."} I'll send the next concrete update inside 30 minutes with either a remediation plan or a clean rollback ETA.`,
    ``,
    `Apologies for the friction — we know what this means for your customer-facing agents. We own this one.`,
    ``,
    `${owner}`,
  ].join("\n");
}

// Temporal-specific tool returns used by both the rule-based fallback and the live LLM tools

function mockInspectWorkflowCode(input: {
  ticket: PylonTicket;
  account: SalesforceAccount;
}): string {
  const slug = input.account.name.toLowerCase().replace(/\s+/g, "-");
  return [
    `Repo: ${slug}/agent-pipeline (default branch: main)`,
    `Commits in last 24h: 7`,
    `Most recent merged PRs:`,
    `  #4521 (merged 2h ago) — "tighten activity timeout for processInvoice"`,
    `    Changes startToCloseTimeout: 30s → 5s on the processInvoice activity`,
    `    Author: @lee.zhao  ·  Reviewers: 1`,
    `  #4519 (merged 5h ago) — "bump @temporalio/worker to 1.8.2"`,
    `    SDK version bump`,
    `  #4517 (merged 18h ago) — "add custom data converter for PII fields"`,
    ``,
    `Suspicious change: #4521 — reducing startToCloseTimeout to 5s on processInvoice. ` +
      `Production traces show this activity typically runs 8–12s under load. ` +
      `Every execution would now time out and retry.`,
  ].join("\n");
}

function mockWorkerHealth(input: { account: SalesforceAccount }): string {
  return [
    `Namespace: ${input.account.name.toLowerCase().replace(/\s+/g, "-")}-prod`,
    `Lookback window: 2h`,
    ``,
    `Worker count: 12 (steady, baseline 12)`,
    `Workflow task poll latency p95: 47ms (normal, baseline 40–55ms)`,
    `Activity task poll latency p95: 39ms (normal)`,
    `Task slot saturation: 94% workflow, 88% activity (ELEVATED — baseline 55–60%)`,
    `Panic count: 0 in last 2h`,
    `Workflow task failure rate: 11.4% (ELEVATED — baseline <1%)`,
    `  → Spike begins at 2h02m ago, matches PR #4521 merge time`,
    ``,
    `SDK version matrix (typescript):`,
    `  11 workers on 1.8.2 (current)`,
    `  1 worker on 1.7.4 (one version behind — drift)`,
  ].join("\n");
}

function mockClusterHealth(): string {
  return [
    `Cluster-side namespace metrics (last 12h):`,
    `  History shard latency p95: 18ms (baseline 15ms — within tolerance)`,
    `  Frontend service: healthy`,
    `  Matching service: healthy`,
    `  Cross-region replication lag: 1.2s (normal)`,
    ``,
    `Known incidents touching this namespace: none in the last 12h`,
    `temporal.io status: all systems operational`,
    ``,
    `Conclusion: Temporal cluster is not the source of latency.`,
  ].join("\n");
}

function mockSdkReleases(input: { account: SalesforceAccount }): string {
  return [
    `Customer SDK version: typescript-1.8.2 (released 4d ago)`,
    ``,
    `Open known issues affecting 1.8.2:`,
    `  - sdk-typescript#4823: "Activity retries can compound under tight ` +
      `startToCloseTimeout settings if historic activity duration > timeout"`,
    `    Status: confirmed, fix planned for 1.8.4`,
    `    Mitigation: raise startToCloseTimeout to be > p99 activity duration`,
    ``,
    `Recommended upgrades: 1.8.2 is current, no upgrade fix available yet. ` +
      `Workaround #4823 applies directly to this case.`,
    ``,
    `Stragglers: 1 worker still on 1.7.4. Recommend rolling restart to align fleet.`,
  ].join("\n");
}

function mockPastEscalations(input: { ticket: PylonTicket }): string {
  return [
    `Searched 1,247 past escalations across all customers.`,
    `Top matches by symptom "${input.ticket.subject}" + pattern "retry policy change":`,
    ``,
    `1. Zendesk (Aug 2025) — production latency spike after activity timeout tightening`,
    `   Resolution: rolled back PR. Time to mitigation: 22 min.`,
    ``,
    `2. Stripe (Mar 2025) — workflow task failures correlating with sub-second timeouts`,
    `   Resolution: raised startToCloseTimeout to p99 of activity duration. ` +
      `Time to mitigation: 35 min.`,
    ``,
    `3. Vodafone (Jan 2025) — task slot saturation after timeout regression`,
    `   Resolution: rolled back + added pre-merge linter rule. ` +
      `Time to mitigation: 41 min.`,
    ``,
    `Pattern confidence: HIGH. All three resolved within 45 min via rollback or timeout raise.`,
  ].join("\n");
}

function mockRunbook(pattern: string): string {
  if (
    pattern.toLowerCase().includes("latency") ||
    pattern.toLowerCase().includes("retry") ||
    pattern.toLowerCase().includes("timeout")
  ) {
    return [
      `RUNBOOK: workflow-latency-after-timeout-change`,
      `Owner: Platform on-call (rotation: @platform-oncall)`,
      ``,
      `1. Confirm task slot saturation in customer's namespace > 80%`,
      `2. Inspect recent customer PRs for startToCloseTimeout / retry policy changes`,
      `3. If a tightened timeout is detected within last 6h:`,
      `   a. PRIMARY: ask customer to roll back the PR — fastest mitigation`,
      `   b. ALT: customer can raise timeout to > p99 of historical activity duration`,
      `4. Customer comms cadence: 30 min until mitigation confirmed`,
      `5. Post-incident: recommend customer add CI lint rule for timeout regressions`,
      ``,
      `Avg time to mitigation across past cases: 32 min`,
    ].join("\n");
  }
  return "No runbook matched this pattern.";
}

function heuristicInvestigation(input: {
  ticket: PylonTicket;
  account: SalesforceAccount;
  classification: EscalationClassification;
}): {
  findings: string;
  toolCalls: number;
  toolCallDetails: ToolCallRecord[];
  durationMs: number;
} {
  const start = Date.now();
  const owner = input.classification.recommendedOwner.split(",")[0];
  const slug = input.account.name.toLowerCase().replace(/\s+/g, "-");

  const calls: ToolCallRecord[] = [
    {
      name: "inspect_customer_workflow_code",
      args: { accountSlug: slug, since: "24h" },
      result: mockInspectWorkflowCode(input),
      durationMs: 320,
    },
    {
      name: "check_worker_health",
      args: { namespace: `${slug}-prod`, lookback: "2h" },
      result: mockWorkerHealth(input),
      durationMs: 410,
    },
    {
      name: "check_temporal_cluster_health",
      args: { namespace: `${slug}-prod`, since: "12h" },
      result: mockClusterHealth(),
      durationMs: 215,
    },
    {
      name: "correlate_with_sdk_releases",
      args: { sdkVersion: "typescript-1.8.2", since: "7d" },
      result: mockSdkReleases(input),
      durationMs: 180,
    },
    {
      name: "query_past_escalations",
      args: { symptom: "latency spike", pattern: "retry policy change" },
      result: mockPastEscalations(input),
      durationMs: 240,
    },
    {
      name: "lookup_runbook",
      args: { pattern: "workflow-latency-after-timeout-change" },
      result: mockRunbook("latency"),
      durationMs: 95,
    },
  ];

  const findings = [
    `- ROOT CAUSE HYPOTHESIS: PR #4521 (merged 2h ago) reduced startToCloseTimeout on the processInvoice activity from 30s to 5s. Production traces show activity runs 8–12s, so every execution now times out and retries, compounding workflow task load. Task slot saturation jumped from baseline 55–60% to 94%. SDK known issue #4823 confirms the failure mode.`,
    `- BLAST RADIUS: ${input.account.name} production namespace only. Temporal cluster is healthy. One worker still on 1.7.4 (drift) is a secondary issue.`,
    `- RECOMMENDED OWNER ACTION: ${owner} contacts Acme's eng lead. Primary: ask customer to roll back PR #4521. Alt: raise startToCloseTimeout to > p99 activity duration. Past cases (Zendesk, Stripe, Vodafone) resolved within 35–45 min via the same approach.`,
    `- CUSTOMER MESSAGING ANGLE: Be specific that the correlate is in their workflow code (PR #4521), not Temporal cluster. Provide the 30-min rollback ETA and offer to walk through the timeout settings on a call.`,
  ].join("\n");

  const totalToolMs = calls.reduce((s, t) => s + t.durationMs, 0);
  // Wall-clock + synthesis overhead simulates the real LLM agent loop
  const synthesisMs = 1400 + Math.floor(Math.random() * 600);
  return {
    findings,
    toolCalls: calls.length,
    toolCallDetails: calls,
    durationMs: Date.now() - start + totalToolMs + synthesisMs,
  };
}

function heuristicPlaybook(basedOnEvents: number): Playbook {
  return {
    generatedAt: new Date().toISOString(),
    basedOnEvents,
    summary:
      basedOnEvents === 0
        ? "No prior escalations to cluster yet — generate again after a few cases close."
        : "3 recurring patterns across recent escalations. Two carry product signals; one is enablement; all also have an ops-side action.",
    entries: [
      {
        pattern: "Activity timeout tightening triggers retry storm",
        signals: [
          "Customer PR reduces startToCloseTimeout in the last 6h",
          "Task slot saturation > 80% within 30 min of merge",
          "Workflow task failure rate jumps from baseline <1% to >10%",
        ],
        signalsFor: ["product", "enablement", "ops"],
        recommendedAction:
          "Auto-classify as urgent or executive; investigation tool inspect_customer_workflow_code is mandatory for this pattern before drafting customer reply.",
        recommendedRouting:
          "Platform Engineering — SDK startup warning when startToCloseTimeout is below p99 activity duration",
        confidence: "high",
        routings: [
          {
            audience: "product",
            team: "Platform Engineering — TypeScript SDK",
            channel: "#product-feedback",
            artifact:
              "SDK startup warning when activity startToCloseTimeout < p99 of recent activity duration. Optional pre-merge lint rule shipped in the @temporalio/lint package.",
          },
          {
            audience: "enablement",
            team: "Developer Relations / Docs",
            channel: "#docs-requests",
            artifact:
              "Docs page: 'Tuning retry policies and timeouts' with the >p99 rule of thumb and a worked rollout/rollback playbook. Send to the top 50 enterprise customers as a one-time enablement push.",
          },
        ],
      },
      {
        pattern: "SDK version drift within customer's worker fleet",
        signals: [
          "Worker fleet contains 2+ SDK versions in same namespace",
          "Drift exceeds 1 minor version",
          "Coincides with a known-issue match from correlate_with_sdk_releases",
        ],
        signalsFor: ["product", "enablement", "ops"],
        recommendedAction:
          "Note drift in case detail and call it out as a contributing factor in customer comms.",
        recommendedRouting:
          "Cloud / Observability — per-namespace worker SDK drift metric in Temporal UI",
        confidence: "medium",
        routings: [
          {
            audience: "product",
            team: "Cloud / Observability",
            channel: "#product-feedback",
            artifact:
              "Surface 'workers on outdated SDK' as a per-namespace metric in the Temporal UI. Alert customer admins on drift > 1 minor version for > 7 days.",
          },
          {
            audience: "enablement",
            team: "Developer Relations",
            channel: "#docs-requests",
            artifact:
              "Rolling-deploy guide for SDK upgrades; add to onboarding checklist. Office hours session on safe SDK upgrade patterns.",
          },
        ],
      },
      {
        pattern: "Open renewal + production impact",
        signals: [
          "openOpportunity is true",
          "priority is high or critical",
          "Account tier is enterprise or strategic",
        ],
        signalsFor: ["ops"],
        recommendedAction:
          "Notify account owner and CRO directly; treat as exec-visible regardless of risk score; pre-stage the renewal conversation in the customer comms thread.",
        recommendedRouting:
          "Support Escalation Ops — exec-visible renewal risk runbook update",
        confidence: "medium",
        routings: [],
      },
    ],
  };
}
