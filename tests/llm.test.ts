import { describe, it, expect, beforeEach } from "vitest";
import {
  draftCustomerReply,
  runInvestigation,
  clusterIntoPlaybook,
} from "../src/lib/llm";
import type { PylonTicket, SalesforceAccount, EscalationClassification } from "../src/temporal/types";

const ticket: PylonTicket = {
  id: "ticket-acme-latency-001",
  customerName: "Acme AI",
  requesterEmail: "mira@acme-ai.example",
  subject: "Production workflow latency spike after rollout",
  body: "Body",
  priority: "high",
  createdAt: new Date().toISOString(),
  slaMinutesRemaining: 42,
};

const account: SalesforceAccount = {
  id: "sf-acct-acme-ai",
  name: "Acme AI",
  tier: "enterprise",
  arrBand: "$250K+",
  owner: "Jordan Lee, Strategic CSM",
  openOpportunity: true,
};

const classification: EscalationClassification = {
  riskScore: 115,
  riskLabel: "executive",
  reason: "test",
  recommendedOwner: "Jordan Lee, Strategic CSM",
  recommendedAction: "Page on-call, exec-visible.",
};

describe("LLM mock fallbacks", () => {
  beforeEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
  });

  it("draftCustomerReply returns a non-empty string addressed to the customer", async () => {
    const result = await draftCustomerReply({ ticket, account, classification });
    expect(result.usage.source).toBe("mock");
    expect(result.reply.length).toBeGreaterThan(50);
    expect(result.reply).toMatch(/Acme AI/);
  });

  it("runInvestigation returns structured findings", async () => {
    const result = await runInvestigation({
      ticket,
      account,
      classification,
      recentEvents: [],
    });
    expect(result.usage.source).toBe("mock");
    expect(result.findings).toMatch(/ROOT CAUSE HYPOTHESIS/);
    expect(result.findings).toMatch(/RECOMMENDED OWNER ACTION/);
    expect(result.toolCalls).toBeGreaterThan(0);
  });

  it("clusterIntoPlaybook handles empty event log", async () => {
    const result = await clusterIntoPlaybook({ events: [] });
    expect(result.usage.source).toBe("mock");
    expect(result.playbook.basedOnEvents).toBe(0);
    expect(result.playbook.entries.length).toBeGreaterThan(0);
  });

  it("clusterIntoPlaybook produces playbook entries with confidence labels", async () => {
    const result = await clusterIntoPlaybook({
      events: [
        {
          at: new Date().toISOString(),
          eventType: "workflow_started",
          workflowId: "wf-1",
          payload: { riskLabel: "executive" },
        },
      ],
    });
    for (const entry of result.playbook.entries) {
      expect(["low", "medium", "high"]).toContain(entry.confidence);
      expect(entry.signals.length).toBeGreaterThan(0);
    }
  });

  it("clusterIntoPlaybook includes product routing signals for the demo surface", async () => {
    const result = await clusterIntoPlaybook({ events: [] });
    const productEntries = result.playbook.entries.filter((entry) =>
      entry.signalsFor.includes("product"),
    );
    expect(productEntries.length).toBeGreaterThan(0);
    expect(productEntries[0].recommendedRouting).toMatch(/Engineering|Observability/);
    expect(
      productEntries[0].routings.some(
        (routing) =>
          routing.audience === "product" && routing.channel === "#product-feedback",
      ),
    ).toBe(true);
  });
});
