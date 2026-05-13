import { describe, it, expect, beforeEach } from "vitest";
import { classifyTicketWithLLM } from "../src/lib/llm";
import type { PylonTicket, SalesforceAccount } from "../src/temporal/types";

const baseTicket: PylonTicket = {
  id: "t1",
  customerName: "Acme AI",
  requesterEmail: "mira@acme-ai.example",
  subject: "Latency spike",
  body: "x",
  priority: "high",
  createdAt: new Date().toISOString(),
  slaMinutesRemaining: 42,
};

const enterpriseAccount: SalesforceAccount = {
  id: "sf-acct-acme-ai",
  name: "Acme AI",
  tier: "enterprise",
  arrBand: "$250K+",
  owner: "Jordan Lee",
  openOpportunity: true,
};

const selfServeAccount: SalesforceAccount = {
  id: "sf-acct-zed",
  name: "Zed",
  tier: "self-serve",
  arrBand: "$0-$5K",
  owner: "Support Ops",
  openOpportunity: false,
};

describe("classifyTicketWithLLM (mock fallback)", () => {
  beforeEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
  });

  it("falls back to mock when no API key and scores enterprise > self-serve", async () => {
    const a = await classifyTicketWithLLM({ ticket: baseTicket, account: enterpriseAccount });
    const b = await classifyTicketWithLLM({
      ticket: { ...baseTicket, priority: "low", slaMinutesRemaining: 600 },
      account: selfServeAccount,
    });
    expect(a.usage.source).toBe("mock");
    expect(b.usage.source).toBe("mock");
    expect(a.classification.riskScore).toBeGreaterThan(b.classification.riskScore);
  });

  it("labels enterprise + open opp + high priority + tight SLA as urgent or executive", async () => {
    const c = await classifyTicketWithLLM({ ticket: baseTicket, account: enterpriseAccount });
    expect(["urgent", "executive"]).toContain(c.classification.riskLabel);
    expect(c.classification.recommendedOwner).toBe("Jordan Lee");
  });
});
