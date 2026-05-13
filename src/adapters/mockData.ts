import type { PylonTicket, SalesforceAccount } from "../temporal/types";

export const mockTickets: Record<string, PylonTicket> = {
  "ticket-acme-latency-001": {
    id: "ticket-acme-latency-001",
    customerName: "Acme AI",
    requesterEmail: "mira@acme-ai.example",
    subject: "Production workflow latency spike after rollout",
    body: "After this morning's rollout, our production workflows are showing latency spikes and delayed completions. This is affecting our customer-facing agent pipeline.",
    priority: "high",
    createdAt: new Date().toISOString(),
    slaMinutesRemaining: 42,
  },
};

export const mockAccounts: Record<string, SalesforceAccount> = {
  "mira@acme-ai.example": {
    id: "sf-acct-acme-ai",
    name: "Acme AI",
    tier: "enterprise",
    arrBand: "$250K+",
    owner: "Jordan Lee, Strategic CSM",
    renewalDate: "2026-06-25",
    openOpportunity: true,
  },
};
