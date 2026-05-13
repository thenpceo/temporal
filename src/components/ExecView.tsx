"use client";

import { useCallback, useEffect, useState } from "react";
import type { SupportEscalationState } from "@/temporal/types";
import { SlackChannel } from "./SlackChannel";

interface WorkflowWithState {
  workflowId: string;
  startedAt: string;
  state: SupportEscalationState | null;
}

const ARR_ESTIMATE: Record<string, number> = {
  strategic: 1_500_000,
  enterprise: 350_000,
  growth: 60_000,
  "self-serve": 5_000,
};

export function ExecView() {
  const [items, setItems] = useState<WorkflowWithState[]>([]);

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
    const t = setInterval(refresh, 3000);
    return () => clearInterval(t);
  }, [refresh]);

  const execVisible = items.filter(
    (i) => i.state?.execVisible || i.state?.classification?.riskLabel === "executive",
  );

  const totalArr = execVisible.reduce((sum, i) => {
    const tier = i.state?.account?.tier ?? "growth";
    return sum + (ARR_ESTIMATE[tier] ?? 0);
  }, 0);

  const tightSla = execVisible.filter(
    (i) => (i.state?.ticket?.slaMinutesRemaining ?? 999) <= 60,
  ).length;

  const focusState = execVisible[0]?.state ?? items[0]?.state ?? null;

  return (
    <>
      <section className="section-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <div className="bigstat">
          <div className="label">Exec-visible · this week</div>
          <div
            className="num"
            style={{ color: execVisible.length > 0 ? "var(--danger)" : undefined }}
          >
            {execVisible.length}
          </div>
          <div className="sub">accounts you should know about</div>
        </div>
        <div className="bigstat">
          <div className="label">ARR at risk</div>
          <div className="num">${(totalArr / 1_000_000).toFixed(2)}M</div>
          <div className="sub">sum of exec-visible account ARR estimates</div>
        </div>
        <div className="bigstat">
          <div className="label">Within SLA window</div>
          <div className="num" style={{ color: tightSla > 0 ? "var(--warn)" : undefined }}>
            {tightSla}
          </div>
          <div className="sub">cases with under 60 min remaining</div>
        </div>
      </section>

      <SlackChannel
        channel="exec-escalations"
        topic="P0/P1 escalations · auto-posted when a CSM flags exec-visible"
        state={focusState}
        audience="exec"
      />

      <section style={{ padding: "1.5rem", display: "grid", gap: "1rem" }}>
        <div
          style={{
            padding: "1.25rem 1.5rem",
            background: "var(--panel-2)",
            border: "var(--line)",
            borderLeft: "3px solid var(--accent-2)",
          }}
        >
          <div
            style={{
              fontSize: "0.7rem",
              textTransform: "uppercase",
              letterSpacing: "0.16em",
              color: "var(--accent-2)",
              fontWeight: 500,
              marginBottom: "0.6rem",
            }}
          >
            Friday rollup · also sent as email
          </div>
          <div
            style={{
              fontSize: "1.05rem",
              fontWeight: 500,
              letterSpacing: "-0.01em",
              marginBottom: "0.5rem",
            }}
          >
            This week: {execVisible.length} account
            {execVisible.length === 1 ? "" : "s"} on the board.{" "}
            ${(totalArr / 1_000_000).toFixed(2)}M in ARR at risk.
          </div>
          <div style={{ color: "var(--text-2)", fontSize: "0.92rem", lineHeight: 1.65 }}>
            {execVisible.length === 0 ? (
              "Quiet week. No escalations breached the exec-visible threshold."
            ) : (
              <>
                Most acute: <strong>{execVisible[0]?.state?.account?.name}</strong> —{" "}
                {execVisible[0]?.state?.ticket?.subject}. Owner:{" "}
                {(execVisible[0]?.state?.assignedOwner ??
                  execVisible[0]?.state?.classification?.recommendedOwner ??
                  "TBD").split(",")[0]}
                .
                {execVisible.some((e) => e.state?.resolved)
                  ? ` ${execVisible.filter((e) => e.state?.resolved).length} resolved.`
                  : ""}{" "}
                Customer comms{" "}
                {execVisible.some((e) => e.state?.draftReply?.status === "approved")
                  ? "have been sent."
                  : "are pending CSM approval."}
              </>
            )}
          </div>
        </div>

        <div className="why" style={{ margin: 0 }}>
          <strong>Why this view is mostly Slack.</strong> Execs don&apos;t sit on dashboards.
          They get pinged in <span className="mono">#exec-escalations</span> when a CSM flags
          something, and they read the Friday rollup. The numbers above are scaffolding for
          your weekly 1:1 with the CRO — not the primary surface.
        </div>
      </section>
    </>
  );
}
