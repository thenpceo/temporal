"use client";

import type { InvestigationFindings, ToolCallRecord } from "@/temporal/types";
import { IconBrain, IconSearch, IconChevronRight } from "./icons";
import { useState } from "react";

interface Props {
  investigation?: InvestigationFindings;
  isInvestigating: boolean;
}

const TOOL_LABELS: Record<string, string> = {
  inspect_customer_workflow_code: "inspect customer workflow code",
  check_worker_health: "check worker health",
  check_temporal_cluster_health: "check Temporal cluster health",
  correlate_with_sdk_releases: "correlate with SDK releases",
  query_past_escalations: "query past escalations",
  lookup_runbook: "lookup runbook",
};

const TOOL_DESCRIPTIONS: Record<string, string> = {
  inspect_customer_workflow_code:
    "Reads the customer's workflow repo for recent commits/PRs that touch retry policies, timeouts, or activity definitions.",
  check_worker_health:
    "Pulls worker fleet metrics from the customer's namespace: count, poll latency, task slot saturation, SDK version drift, panic rate, task failure rate.",
  check_temporal_cluster_health:
    "Verifies Temporal cluster-side health for the customer's namespace: history shard latency, frontend/matching services, replication lag, known incidents.",
  correlate_with_sdk_releases:
    "Matches the customer's pinned SDK version against open issues in the official Temporal SDK changelog.",
  query_past_escalations:
    "Searches prior escalations across the full Temporal customer base for analogous symptom + pattern matches and their resolution times.",
  lookup_runbook:
    "Returns the runbook entry that matches the symptom pattern, including owner and mitigation steps.",
};

export function InvestigationPanel({ investigation, isInvestigating }: Props) {
  if (!investigation && !isInvestigating) return null;

  return (
    <section className="panel fade-in">
      <div className="panel-head">
        <h2>
          <IconSearch width={13} height={13} /> Agentic triage investigation
        </h2>
        {investigation ? (
          <span className="meta">
            {investigation.toolCalls} tools called · {investigation.durationMs}ms
          </span>
        ) : (
          <span className="meta">child workflow running…</span>
        )}
      </div>

      {!investigation ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <div
            className="muted"
            style={{ fontSize: "0.84rem", display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
          >
            <IconBrain width={14} height={14} /> Spawned <code className="mono">TriageInvestigationWorkflow</code>.
            Claude is calling Temporal-specific tools (workflow code, worker health, cluster, SDK
            releases, past escalations, runbook) before synthesising findings.
          </div>
          <div className="skeleton" style={{ width: "100%", height: 14 }} />
          <div className="skeleton" style={{ width: "85%", height: 14 }} />
        </div>
      ) : (
        <>
          {investigation.toolCallDetails && investigation.toolCallDetails.length > 0 ? (
            <div className="tool-calls">
              {investigation.toolCallDetails.map((tool, i) => (
                <ToolCallRow key={i} index={i} tool={tool} />
              ))}
            </div>
          ) : null}

          <div className="findings-divider">
            <span>Synthesis</span>
          </div>
          <pre className="findings">{investigation.findings}</pre>

          {investigation.childWorkflowId ? (
            <div
              className="muted mono"
              style={{ fontSize: "0.72rem", marginTop: "0.55rem" }}
            >
              child workflow: {investigation.childWorkflowId}
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

function ToolCallRow({ index, tool }: { index: number; tool: ToolCallRecord }) {
  const [open, setOpen] = useState(index < 2);
  const label = TOOL_LABELS[tool.name] ?? tool.name;
  const desc = TOOL_DESCRIPTIONS[tool.name];
  const argString = Object.entries(tool.args)
    .map(([k, v]) => `${k}: "${v}"`)
    .join(", ");

  return (
    <div className={`tool-call${open ? " open" : ""}`}>
      <button
        type="button"
        className="tool-call-head"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="tool-call-num">{String(index + 1).padStart(2, "0")}</span>
        <span className="tool-call-name">
          <span className="mono" style={{ color: "var(--accent-2)" }}>
            {tool.name}
          </span>
          <span className="tool-call-label">{label}</span>
        </span>
        <span className="tool-call-args mono">{argString}</span>
        <span className="tool-call-meta mono">{tool.durationMs}ms</span>
        <span className={`tool-call-chev${open ? " open" : ""}`}>
          <IconChevronRight width={14} height={14} />
        </span>
      </button>
      {open ? (
        <div className="tool-call-body">
          {desc ? <div className="tool-call-desc">{desc}</div> : null}
          <pre className="tool-call-result">{tool.result}</pre>
        </div>
      ) : null}
    </div>
  );
}
