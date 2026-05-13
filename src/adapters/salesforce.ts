import type { SalesforceAccount, SupportEscalationState } from "../temporal/types";
import { mockAccounts } from "./mockData";
import { env } from "../lib/env";

export async function getSalesforceAccountByEmail(email: string): Promise<SalesforceAccount> {
  if (env.salesforceInstanceUrl && !env.useMocks) {
    throw new Error("Salesforce live integration not implemented in this demo build.");
  }

  const account = mockAccounts[email.toLowerCase()];
  if (!account) {
    return {
      id: `sf-acct-unknown-${Date.now()}`,
      name: email.split("@")[1] ?? "Unknown",
      tier: "growth",
      arrBand: "$25K-$100K",
      owner: "Support Ops",
      openOpportunity: false,
    };
  }
  return account;
}

export async function upsertSalesforceCase(state: SupportEscalationState): Promise<string> {
  if (env.salesforceInstanceUrl && !env.useMocks) {
    throw new Error("Salesforce live integration not implemented in this demo build.");
  }

  const ticketSlug = state.ticket?.id.replace(/[^a-zA-Z0-9]/g, "-") ?? "case";
  return `sf-case-${ticketSlug}`;
}
