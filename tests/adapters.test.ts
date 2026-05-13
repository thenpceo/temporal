import { describe, it, expect, beforeEach } from "vitest";
import { getPylonTicket } from "../src/adapters/pylon";
import { getSalesforceAccountByEmail } from "../src/adapters/salesforce";
import { sendSlackEscalation } from "../src/adapters/slack";
import {
  armBigQueryFailure,
  isBigQueryArmed,
  insertBigQueryEvent,
  drainFailureNotesFor,
} from "../src/adapters/bigquery";
import type { SupportEscalationState } from "../src/temporal/types";

function buildState(): SupportEscalationState {
  return {
    workflowId: "wf-test",
    phase: "received",
    bigQueryEventIds: [],
    execVisible: false,
    failureNotes: [],
    resolved: false,
    playbookLoaded: false,
    ticket: {
      id: "ticket-acme-latency-001",
      customerName: "Acme AI",
      requesterEmail: "mira@acme-ai.example",
      subject: "Production workflow latency spike after rollout",
      body: "Body",
      priority: "high",
      createdAt: new Date().toISOString(),
      slaMinutesRemaining: 42,
    },
  };
}

describe("Pylon mock adapter", () => {
  it("returns the Acme AI ticket", async () => {
    const ticket = await getPylonTicket("ticket-acme-latency-001");
    expect(ticket.customerName).toBe("Acme AI");
    expect(ticket.priority).toBe("high");
    expect(ticket.slaMinutesRemaining).toBeLessThanOrEqual(60);
  });

  it("throws for unknown ticket id", async () => {
    await expect(getPylonTicket("does-not-exist")).rejects.toThrow();
  });
});

describe("Salesforce mock adapter", () => {
  it("returns enterprise Acme account", async () => {
    const account = await getSalesforceAccountByEmail("mira@acme-ai.example");
    expect(account.tier).toBe("enterprise");
    expect(account.openOpportunity).toBe(true);
  });
});

describe("Slack adapter", () => {
  it("returns a thread URL even without webhook", async () => {
    const state = buildState();
    const url = await sendSlackEscalation(state, "new_escalation");
    expect(url).toMatch(/slack\.example\.com/);
  });
});

describe("BigQuery adapter", () => {
  beforeEach(async () => {
    while (await isBigQueryArmed()) {
      await insertBigQueryEvent(buildState(), "drain").catch(() => undefined);
    }
  });

  it("fails once when armed, then succeeds", async () => {
    await armBigQueryFailure();
    expect(await isBigQueryArmed()).toBe(true);

    const state = buildState();
    // Drain any pending notes left over from prior tests so the count is clean.
    drainFailureNotesFor(state.workflowId);

    await expect(insertBigQueryEvent(state, "first")).rejects.toThrow(/Injected BigQuery failure/);

    const id = await insertBigQueryEvent(state, "second");
    expect(id).toMatch(/^bq-evt-/);

    // The adapter records failure notes in a process-local buffer (activities
    // can't mutate workflow state across the worker→workflow boundary). The
    // workflow drains them via the drainBigQueryFailureNotes activity.
    const notes = drainFailureNotesFor(state.workflowId);
    expect(notes.length).toBeGreaterThan(0);
    expect(notes[0]).toMatch(/failed once for event "first"/);
  });

  it("records event ID on success", async () => {
    const id = await insertBigQueryEvent(buildState(), "workflow_started");
    expect(id).toMatch(/^bq-evt-/);
  });
});
