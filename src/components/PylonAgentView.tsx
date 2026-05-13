"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { SupportEscalationState } from "@/temporal/types";
import { IconActivity, IconBrain, IconCheck, IconChevronRight, IconExternalLink, IconUser } from "./icons";

interface Props {
  workflowId: string;
}

export function PylonAgentView({ workflowId }: Props) {
  const [state, setState] = useState<SupportEscalationState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/workflows/${encodeURIComponent(workflowId)}/query`, {
        cache: "no-store",
      });
      if (!res.ok) {
        setError("Ticket not found");
        return;
      }
      const data = (await res.json()) as { state: SupportEscalationState | null };
      setState(data.state);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [workflowId]);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 2000);
    return () => clearInterval(t);
  }, [refresh]);

  if (error) return <div className="empty" style={{ margin: "1.5rem" }}>{error}</div>;
  if (!state) return <div className="empty" style={{ margin: "1.5rem" }}>Loading…</div>;

  const risk = state.classification?.riskLabel ?? "normal";

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr" }}>
      {/* Left: Pylon-native ticket view */}
      <div style={{ borderRight: "var(--line)" }}>
        <div style={{ padding: "1.5rem", borderBottom: "var(--line)" }}>
          <div className="eyebrow" style={{ color: "var(--muted)", fontSize: "0.7rem", letterSpacing: "0.16em", textTransform: "uppercase" }}>
            Pylon · ticket #{state.ticket?.id.slice(-12) ?? "—"}
          </div>
          <h1 style={{ margin: "0.55rem 0 0", fontSize: "1.45rem", fontWeight: 500, letterSpacing: "-0.02em" }}>
            {state.ticket?.subject ?? "Untitled ticket"}
          </h1>
          <div style={{ marginTop: "0.5rem", color: "var(--muted)", fontSize: "0.88rem" }}>
            From <span style={{ color: "var(--text)" }}>{state.ticket?.requesterEmail}</span> ·{" "}
            {state.ticket?.customerName}
          </div>
        </div>

        <div style={{ padding: "1.5rem", borderBottom: "var(--line)" }}>
          <div
            style={{
              fontSize: "0.78rem",
              color: "var(--muted)",
              marginBottom: "0.6rem",
              textTransform: "uppercase",
              letterSpacing: "0.14em",
              fontWeight: 500,
            }}
          >
            Message
          </div>
          <div style={{ fontSize: "0.92rem", lineHeight: 1.65, color: "var(--text-2)" }}>
            {state.ticket?.body}
          </div>
        </div>

        {state.draftReply ? (
          <div style={{ padding: "1.5rem", borderBottom: "var(--line)", background: "var(--panel-2)" }}>
            <div
              style={{
                fontSize: "0.78rem",
                color: "var(--accent-2)",
                marginBottom: "0.6rem",
                textTransform: "uppercase",
                letterSpacing: "0.14em",
                fontWeight: 500,
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
              }}
            >
              <IconBrain width={12} height={12} /> AI-drafted reply ·{" "}
              {state.draftReply.status === "approved"
                ? "approved & sent"
                : state.draftReply.status === "edited"
                  ? "CSM-edited"
                  : "awaiting CSM approval"}
            </div>
            <pre className="draft-preview" style={{ fontSize: "0.9rem" }}>
              {state.draftReply.editedContent ?? state.draftReply.content}
            </pre>
          </div>
        ) : null}

        <div style={{ padding: "1.5rem" }}>
          <div
            style={{
              fontSize: "0.78rem",
              color: "var(--muted)",
              marginBottom: "0.75rem",
              textTransform: "uppercase",
              letterSpacing: "0.14em",
              fontWeight: 500,
            }}
          >
            Activity
          </div>
          <div className="timeline-events" style={{ borderTop: "var(--line)", borderLeft: "var(--line)", borderRight: "var(--line)" }}>
            {state.bigQueryEventIds.length === 0 ? (
              <div className="timeline-event"><div className="when">—</div><div className="what"><strong>No activity yet</strong></div></div>
            ) : (
              state.bigQueryEventIds.map((id, i) => (
                <div className="timeline-event" key={id}>
                  <div className="when">event #{i + 1}</div>
                  <div className="what">
                    <strong className="mono" style={{ fontFamily: "var(--font-mono)", fontSize: "0.82rem" }}>{id}</strong>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Right: Temporal side panel */}
      <div>
        <div style={{ padding: "1.5rem", borderBottom: "var(--line)", background: "var(--panel-2)" }}>
          <div
            style={{
              fontSize: "0.7rem",
              color: "var(--accent-2)",
              textTransform: "uppercase",
              letterSpacing: "0.16em",
              fontWeight: 500,
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
            }}
          >
            <IconActivity width={12} height={12} /> Temporal · durable workflow
          </div>
          <div className="mono" style={{ fontSize: "0.74rem", marginTop: "0.5rem", color: "var(--muted)", wordBreak: "break-all" }}>
            {state.workflowId}
          </div>
          <div style={{ marginTop: "0.85rem", display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
            <span className={`pill ${risk}`}>{risk}</span>
            <span className="pill phase">{state.phase.replaceAll("_", " ")}</span>
            {state.execVisible ? <span className="pill executive">exec visible</span> : null}
            {state.resolved ? <span className="pill normal">resolved</span> : null}
          </div>
        </div>

        <div style={{ padding: "1.25rem 1.5rem", borderBottom: "var(--line)" }}>
          <dl className="kv">
            <dt>Customer</dt>
            <dd>{state.account?.name}</dd>
            <dt>Tier</dt>
            <dd>{state.account?.tier} · {state.account?.arrBand}</dd>
            <dt>Owner</dt>
            <dd>
              <IconUser width={11} height={11} style={{ verticalAlign: "-1px", marginRight: 4 }} />
              {state.assignedOwner ?? state.classification?.recommendedOwner ?? "Unassigned"}
            </dd>
            <dt>SLA</dt>
            <dd>{state.ticket?.slaMinutesRemaining ?? "?"}m remaining</dd>
            <dt>Salesforce case</dt>
            <dd className="mono">{state.salesforceCaseId ?? "—"}</dd>
          </dl>
        </div>

        {state.investigation ? (
          <div style={{ padding: "1.25rem 1.5rem", borderBottom: "var(--line)" }}>
            <div
              style={{
                fontSize: "0.7rem",
                color: "var(--accent-2)",
                textTransform: "uppercase",
                letterSpacing: "0.16em",
                fontWeight: 500,
                marginBottom: "0.55rem",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
              }}
            >
              <IconBrain width={12} height={12} /> AI triage findings
            </div>
            <div className="mono" style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: "0.6rem" }}>
              {state.investigation.toolCalls} tools · {state.investigation.durationMs}ms · {state.investigation.source}
            </div>
            <pre className="findings" style={{ fontSize: "0.74rem" }}>
              {state.investigation.findings}
            </pre>
          </div>
        ) : null}

        <div style={{ padding: "1.25rem 1.5rem" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <Link
              href={`/cases/${encodeURIComponent(workflowId)}`}
              style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.86rem" }}
            >
              Full case detail <IconChevronRight width={13} height={13} />
            </Link>
            <Link
              href={`/status/${encodeURIComponent(workflowId)}`}
              style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.86rem" }}
            >
              <IconCheck width={13} height={13} /> Customer-facing view
            </Link>
            <a
              href={state.salesforceCaseId ? "#" : "#"}
              style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.86rem" }}
            >
              Salesforce case <IconExternalLink width={13} height={13} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
