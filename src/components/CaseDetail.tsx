"use client";

import { useEffect, useState, useCallback } from "react";
import type { SupportEscalationState } from "@/temporal/types";

interface Props {
  workflowId: string;
}

interface QueryResponse {
  workflowId: string;
  runId?: string;
  status?: string;
  state: SupportEscalationState | null;
}

export function CaseDetail({ workflowId }: Props) {
  const [data, setData] = useState<QueryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch(`/api/workflows/${encodeURIComponent(workflowId)}/query`, {
        cache: "no-store",
      });
      if (!res.ok) {
        setError("Workflow not found or worker offline.");
        return;
      }
      setData(await res.json());
    } catch (err) {
      setError((err as Error).message);
    }
  }, [workflowId]);

  useEffect(() => {
    fetchState();
    const t = setInterval(fetchState, 2000);
    return () => clearInterval(t);
  }, [fetchState]);

  if (error) return <div className="empty">{error}</div>;
  if (!data) return <div className="empty">Loading…</div>;

  const state = data.state;
  if (!state) {
    return (
      <div className="empty">
        No live state for <span className="mono">{workflowId}</span>.
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <section className="panel">
        <div className="section-head">
          <h2>Ticket</h2>
          <span className="pill phase">{state.phase.replaceAll("_", " ")}</span>
        </div>
        <dl className="kv">
          <dt>ID</dt>
          <dd className="mono">{state.ticket?.id ?? "—"}</dd>
          <dt>Customer</dt>
          <dd>{state.ticket?.customerName ?? "—"}</dd>
          <dt>Requester</dt>
          <dd className="mono">{state.ticket?.requesterEmail ?? "—"}</dd>
          <dt>Subject</dt>
          <dd>{state.ticket?.subject ?? "—"}</dd>
          <dt>Body</dt>
          <dd>{state.ticket?.body ?? "—"}</dd>
          <dt>Priority</dt>
          <dd>{state.priorityOverride ?? state.ticket?.priority ?? "—"}</dd>
          <dt>SLA remaining</dt>
          <dd>{state.ticket ? `${state.ticket.slaMinutesRemaining} minutes` : "—"}</dd>
        </dl>
      </section>

      <section className="panel">
        <div className="section-head">
          <h2>Salesforce account</h2>
        </div>
        <dl className="kv">
          <dt>Account</dt>
          <dd>{state.account?.name ?? "—"}</dd>
          <dt>Tier</dt>
          <dd>{state.account?.tier ?? "—"}</dd>
          <dt>ARR band</dt>
          <dd>{state.account?.arrBand ?? "—"}</dd>
          <dt>Owner</dt>
          <dd>{state.account?.owner ?? "—"}</dd>
          <dt>Renewal date</dt>
          <dd>{state.account?.renewalDate ?? "—"}</dd>
          <dt>Open opportunity</dt>
          <dd>{state.account?.openOpportunity ? "Yes" : "No"}</dd>
          <dt>Case ID</dt>
          <dd className="mono">{state.salesforceCaseId ?? "—"}</dd>
        </dl>
      </section>

      <section className="panel">
        <div className="section-head">
          <h2>AI classification</h2>
          {state.classification ? (
            <span className={`pill ${state.classification.riskLabel}`}>
              {state.classification.riskLabel} ({state.classification.riskScore})
            </span>
          ) : null}
        </div>
        <dl className="kv">
          <dt>Risk score</dt>
          <dd>{state.classification?.riskScore ?? "—"}</dd>
          <dt>Risk label</dt>
          <dd>{state.classification?.riskLabel ?? "—"}</dd>
          <dt>Reason</dt>
          <dd>{state.classification?.reason ?? "—"}</dd>
          <dt>Recommended owner</dt>
          <dd>{state.classification?.recommendedOwner ?? "—"}</dd>
          <dt>Recommended action</dt>
          <dd>{state.classification?.recommendedAction ?? "—"}</dd>
          <dt>Current owner</dt>
          <dd>{state.assignedOwner ?? "Unassigned"}</dd>
          <dt>Playbook context</dt>
          <dd className="muted" style={{ fontSize: "0.82rem" }}>
            {state.playbookLoaded ? state.playbookSummary ?? "loaded" : "not loaded"}
          </dd>
        </dl>
      </section>

      {state.investigation ? (
        <section className="panel">
          <div className="section-head">
            <h2>Triage investigation (child workflow)</h2>
            <span className="muted mono" style={{ fontSize: "0.78rem" }}>
              {state.investigation.toolCalls} tool calls · {state.investigation.durationMs}ms
            </span>
          </div>
          <pre className="findings">{state.investigation.findings}</pre>
          {state.investigation.childWorkflowId ? (
            <div className="muted mono" style={{ fontSize: "0.75rem", marginTop: "0.5rem" }}>
              child: {state.investigation.childWorkflowId}
            </div>
          ) : null}
        </section>
      ) : null}

      {state.draftReply ? (
        <section className="panel">
          <div className="section-head">
            <h2>AI customer reply ({state.draftReply.status})</h2>
          </div>
          <pre className="draft-preview">
            {state.draftReply.editedContent ?? state.draftReply.content}
          </pre>
        </section>
      ) : null}

      <section className="panel">
        <div className="section-head">
          <h2>Downstream activity</h2>
        </div>
        <dl className="kv">
          <dt>Slack thread</dt>
          <dd className="mono">{state.slackThreadUrl ?? "—"}</dd>
          <dt>BigQuery events</dt>
          <dd className="mono">
            {state.bigQueryEventIds.length === 0 ? "—" : state.bigQueryEventIds.join(", ")}
          </dd>
          <dt>Exec visible</dt>
          <dd>{state.execVisible ? "Yes" : "No"}</dd>
          <dt>Resolved</dt>
          <dd>{state.resolved ? "Yes" : "No"}</dd>
        </dl>

        {state.failureNotes.length > 0 ? (
          <div style={{ marginTop: "0.8rem" }}>
            <strong style={{ fontSize: "0.85rem" }}>Retry log</strong>
            {state.failureNotes.map((n, i) => (
              <div key={i} className="failure-note">
                {n}
              </div>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}
