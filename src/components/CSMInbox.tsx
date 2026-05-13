"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { SupportEscalationState } from "@/temporal/types";
import { IconAlert, IconCheck, IconChevronRight, IconShield, IconBrain, IconMessage } from "./icons";
import { SlackChannel } from "./SlackChannel";

interface WorkflowWithState {
  workflowId: string;
  runId: string;
  ticketId: string;
  startedAt: string;
  temporalUiUrl: string;
  state: SupportEscalationState | null;
}

export function CSMInbox() {
  const [items, setItems] = useState<WorkflowWithState[]>([]);
  const [pending, setPending] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/workflows/all", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { workflows: WorkflowWithState[] };
      setItems(data.workflows);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 2000);
    return () => clearInterval(t);
  }, [refresh]);

  const signal = useCallback(
    async (workflowId: string, signalName: string, value?: unknown, label?: string) => {
      setPending(workflowId);
      try {
        await fetch(`/api/workflows/${encodeURIComponent(workflowId)}/signal`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ signal: signalName, value }),
        });
        setToast(`${label ?? signalName} sent`);
        setTimeout(() => setToast(null), 3000);
        await refresh();
      } finally {
        setPending(null);
      }
    },
    [refresh],
  );

  const sorted = [...items].sort((a, b) => {
    const riskOrder = { executive: 4, urgent: 3, watch: 2, normal: 1 } as const;
    const aRisk = riskOrder[a.state?.classification?.riskLabel ?? "normal"];
    const bRisk = riskOrder[b.state?.classification?.riskLabel ?? "normal"];
    if (aRisk !== bRisk) return bRisk - aRisk;
    return new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime();
  });

  const stats = {
    active: items.filter((i) => i.state && !i.state.resolved).length,
    awaitingApproval: items.filter((i) => i.state?.draftReply?.status === "pending").length,
    execVisible: items.filter((i) => i.state?.execVisible).length,
  };

  return (
    <>
      <section className="section-grid">
        <div className="bigstat">
          <div className="label">Active escalations</div>
          <div className="num">{stats.active}</div>
          <div className="sub">across your accounts</div>
        </div>
        <div className="bigstat">
          <div className="label">Drafts awaiting you</div>
          <div className="num" style={{ color: stats.awaitingApproval > 0 ? "var(--warn)" : undefined }}>
            {stats.awaitingApproval}
          </div>
          <div className="sub">AI-drafted, needs CSM approval</div>
        </div>
      </section>

      <section className="panel" style={{ padding: 0 }}>
        <div
          className="panel-head"
          style={{ padding: "1rem 1.5rem", borderBottom: "var(--line)", margin: 0 }}
        >
          <h2>Queue</h2>
          <span className="meta">sorted by risk</span>
        </div>

        {sorted.length === 0 ? (
          <div className="empty" style={{ border: "none" }}>
            No escalations in your queue. Seed one from the Ops view to begin.
          </div>
        ) : (
          <div>
            {sorted.map((w) => {
              const s = w.state;
              const risk = s?.classification?.riskLabel ?? "normal";
              const draftPending = s?.draftReply?.status === "pending";
              return (
                <div className="queue-row" key={w.workflowId}>
                  <div>
                    <span className={`pill ${risk}`}>{risk}</span>
                  </div>
                  <div>
                    <div className="acct">{s?.account?.name ?? "(loading)"}</div>
                    <div className="sub">
                      {s?.ticket?.subject ?? w.ticketId} ·{" "}
                      <span className="mono">
                        SLA {s?.ticket ? `${s.ticket.slaMinutesRemaining}m` : "?"}
                      </span>
                      {s?.investigation ? (
                        <>
                          {" · "}
                          <span style={{ color: "var(--accent-2)" }}>
                            <IconBrain width={11} height={11} style={{ verticalAlign: "-2px" }} />
                            {" "}AI triage · {s.investigation.toolCalls} tools
                          </span>
                        </>
                      ) : null}
                      {s?.execVisible ? (
                        <>
                          {" · "}
                          <span style={{ color: "var(--danger)" }}>exec-visible</span>
                        </>
                      ) : null}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "0.4rem" }}>
                    {draftPending ? (
                      <button
                        className="cta"
                        onClick={() =>
                          signal(w.workflowId, "approveDraft", undefined, "approve draft")
                        }
                        disabled={pending === w.workflowId}
                      >
                        <IconMessage width={12} height={12} /> Approve draft
                      </button>
                    ) : null}
                    {s && !s.execVisible && !s.resolved ? (
                      <button
                        className="ghost"
                        onClick={() =>
                          signal(w.workflowId, "markExecVisible", undefined, "exec-visible")
                        }
                        disabled={pending === w.workflowId}
                      >
                        <IconShield width={12} height={12} /> Escalate
                      </button>
                    ) : null}
                    {s?.resolved ? (
                      <span className="pill normal">
                        <IconCheck width={11} height={11} /> resolved
                      </span>
                    ) : null}
                  </div>

                  <Link
                    href={`/cases/${encodeURIComponent(w.workflowId)}`}
                    style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.84rem" }}
                  >
                    Open <IconChevronRight width={13} height={13} />
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <SlackChannel
        channel="cs-acme-ai"
        topic="Account channel · auto-posts when a workflow fires"
        state={sorted[0]?.state ?? null}
        audience="csm"
      />

      <div className="why" style={{ margin: "1.5rem" }}>
        <strong>Where the signal actually arrives.</strong> The queue above is where you
        do the work, but the first touch is Slack — when a ticket fires, the workflow
        auto-posts the AI-drafted summary into the account channel with{" "}
        <span className="mono">[Approve]</span> /{" "}
        <span className="mono">[Mark exec-visible]</span> buttons. Click a button →
        Slack signals Temporal → workflow advances → confirmation lands in-thread.
      </div>

      {toast ? (
        <div className="toast success">
          <IconCheck width={14} height={14} /> {toast}
        </div>
      ) : null}
    </>
  );
}
