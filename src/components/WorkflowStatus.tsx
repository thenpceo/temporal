"use client";

import type { SupportEscalationState } from "@/temporal/types";
import Link from "next/link";
import { PhaseTimeline } from "./PhaseTimeline";
import {
  IconBuilding,
  IconAlert,
  IconUser,
  IconClock,
  IconExternalLink,
  IconChevronRight,
  IconBrain,
  IconBookOpen,
} from "./icons";

interface Props {
  workflowId: string;
  runStatus?: string;
  state: SupportEscalationState | null;
  temporalUiUrl?: string;
}

export function WorkflowStatus({ workflowId, runStatus, state, temporalUiUrl }: Props) {
  if (!state) {
    return (
      <div className="empty">
        <div style={{ marginBottom: "0.4rem", fontSize: "0.95rem", color: "var(--text-2)" }}>
          No active workflow
        </div>
        <div>Click <strong>Seed Acme AI ticket</strong> to start one.</div>
      </div>
    );
  }

  const risk = state.classification?.riskLabel ?? "normal";
  const priority = state.priorityOverride ?? state.ticket?.priority ?? "—";

  return (
    <div>
      <PhaseTimeline
        phase={state.phase}
        hasInvestigation={Boolean(state.investigation)}
        hasDraft={Boolean(state.draftReply)}
      />

      <div className="summary-cards">
        <div className="summary-card">
          <div className="label">
            <IconBuilding width={11} height={11} />
            Customer
          </div>
          <div className="primary">{state.ticket?.customerName ?? "—"}</div>
          <div className="secondary">
            {state.account ? `${state.account.tier} · ${state.account.arrBand}` : "—"}
          </div>
        </div>
        <div className="summary-card">
          <div className="label">
            <IconAlert width={11} height={11} />
            Risk
          </div>
          <div className="primary" style={{ textTransform: "capitalize" }}>
            {risk}
            {state.classification ? (
              <span className="muted" style={{ marginLeft: "0.4rem", fontSize: "0.78rem", fontWeight: 400 }}>
                · {state.classification.riskScore}
              </span>
            ) : null}
          </div>
          <div className="secondary">priority: {priority}</div>
        </div>
        <div className="summary-card">
          <div className="label">
            <IconUser width={11} height={11} />
            Owner
          </div>
          <div className="primary">
            {(state.assignedOwner ?? state.classification?.recommendedOwner ?? "—")
              .split(",")[0]}
          </div>
          <div className="secondary">
            {(state.assignedOwner ?? state.classification?.recommendedOwner ?? "")
              .split(",")
              .slice(1)
              .join(",")
              .trim() || (state.assignedOwner ? "assigned" : "recommended")}
          </div>
        </div>
        <div className="summary-card">
          <div className="label">
            <IconClock width={11} height={11} />
            SLA
          </div>
          <div className="primary">
            {state.ticket ? `${state.ticket.slaMinutesRemaining} min` : "—"}
          </div>
          <div className="secondary">
            {state.salesforceCaseId ? `case ${state.salesforceCaseId.slice(-8)}` : "—"}
          </div>
        </div>
      </div>

      <div className="pills">
        {state.classification ? (
          <span className="pill ai">
            <IconBrain width={10} height={10} /> AI classified
          </span>
        ) : null}
        {state.investigation ? (
          <span className="pill ai">
            <IconBrain width={10} height={10} />
            triage · {state.investigation.toolCalls} tools
          </span>
        ) : null}
        {state.playbookLoaded ? (
          <span className="pill ai">
            <IconBookOpen width={10} height={10} />
            playbook
          </span>
        ) : null}
        {state.draftReply?.status === "pending" ? (
          <span className="pill warn-pill">draft pending</span>
        ) : state.draftReply?.status === "approved" ? (
          <span className="pill normal">draft sent</span>
        ) : state.draftReply?.status === "edited" ? (
          <span className="pill watch">draft edited</span>
        ) : null}
        {state.execVisible ? <span className="pill executive">exec visible</span> : null}
        {state.resolved ? <span className="pill normal">resolved</span> : null}
        {runStatus ? (
          <span className="pill mono" style={{ textTransform: "lowercase" }}>
            {runStatus.toLowerCase()}
          </span>
        ) : null}
      </div>

      {state.failureNotes.length > 0 ? (
        <div>
          {state.failureNotes.map((note, i) => (
            <div className="failure-note" key={i}>
              <IconAlert width={14} height={14} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>{note}</span>
            </div>
          ))}
        </div>
      ) : null}

      <div
        style={{
          marginTop: "1rem",
          paddingTop: "0.85rem",
          borderTop: "1px solid var(--border)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "0.75rem",
          flexWrap: "wrap",
        }}
      >
        <span className="muted mono" style={{ fontSize: "0.74rem" }}>{state.workflowId}</span>
        <div style={{ display: "flex", gap: "0.65rem", alignItems: "center" }}>
          <Link href={`/cases/${encodeURIComponent(state.workflowId)}`} style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.85rem" }}>
            Case detail <IconChevronRight width={14} height={14} />
          </Link>
          {temporalUiUrl ? (
            <a href={temporalUiUrl} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.85rem" }}>
              Temporal UI <IconExternalLink width={13} height={13} />
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
