"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Topbar } from "./Topbar";
import { MetricCard } from "./MetricCard";
import { WorkflowStatus } from "./WorkflowStatus";
import { DemoControls } from "./DemoControls";
import { InvestigationPanel } from "./InvestigationPanel";
import { DraftPanel } from "./DraftPanel";
import { PlaybookPanel } from "./PlaybookPanel";
import {
  IconActivity,
  IconAlert,
  IconBuilding,
  IconRotate,
  IconCheck,
  IconExternalLink,
  IconChevronRight,
} from "./icons";
import type { SupportEscalationState } from "@/temporal/types";

interface RecentWorkflow {
  workflowId: string;
  runId: string;
  ticketId: string;
  startedAt: string;
  temporalUiUrl: string;
}

interface QueryResponse {
  workflowId: string;
  runId?: string;
  status?: string;
  state: SupportEscalationState | null;
}

interface Toast {
  text: string;
  err?: boolean;
}

export function CommandCenter() {
  const [recent, setRecent] = useState<RecentWorkflow[]>([]);
  const [activeId, setActiveId] = useState<string | undefined>(undefined);
  const [activeQuery, setActiveQuery] = useState<QueryResponse | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [pending, setPending] = useState(false);
  const [playbookKey, setPlaybookKey] = useState(0);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const showToast = useCallback((text: string, err = false) => {
    setToast({ text, err });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const refreshRecent = useCallback(async () => {
    const res = await fetch("/api/workflows", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as { workflows: RecentWorkflow[] };
    setRecent(data.workflows);
    if (!activeId && data.workflows[0]) {
      setActiveId(data.workflows[0].workflowId);
    }
  }, [activeId]);

  const refreshActive = useCallback(async () => {
    if (!activeId) {
      setActiveQuery(null);
      return;
    }
    try {
      const res = await fetch(`/api/workflows/${encodeURIComponent(activeId)}/query`, {
        cache: "no-store",
      });
      if (!res.ok) {
        setActiveQuery({ workflowId: activeId, state: null });
        return;
      }
      const data = (await res.json()) as QueryResponse;
      setActiveQuery(data);
    } catch {
      setActiveQuery({ workflowId: activeId, state: null });
    }
  }, [activeId]);

  useEffect(() => {
    refreshRecent();
  }, [refreshRecent]);

  useEffect(() => {
    refreshActive();
    if (pollTimer.current) clearInterval(pollTimer.current);
    pollTimer.current = setInterval(refreshActive, 1500);
    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
  }, [refreshActive]);

  const seedTicket = useCallback(async () => {
    setPending(true);
    try {
      const res = await fetch("/api/seed-ticket", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "seed failed");
      setActiveId(data.workflowId);
      await refreshRecent();
      showToast(`Started ${data.workflowId}`);
    } catch (err) {
      showToast(`Seed failed: ${(err as Error).message}`, true);
    } finally {
      setPending(false);
    }
  }, [refreshRecent, showToast]);

  const failBigQuery = useCallback(async () => {
    setPending(true);
    try {
      const res = await fetch("/api/demo/fail-next-bigquery-write", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "arm failed");
      showToast(data.message);
    } catch (err) {
      showToast(`Arm failed: ${(err as Error).message}`, true);
    } finally {
      setPending(false);
    }
  }, [showToast]);

  const signal = useCallback(
    async (signalName: string, value?: unknown, label?: string) => {
      if (!activeId) return;
      setPending(true);
      try {
        const res = await fetch(`/api/workflows/${encodeURIComponent(activeId)}/signal`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ signal: signalName, value }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "signal failed");
        showToast(`Signal: ${label ?? signalName}`);
        await refreshActive();
      } catch (err) {
        showToast(`Signal failed: ${(err as Error).message}`, true);
      } finally {
        setPending(false);
      }
    },
    [activeId, refreshActive, showToast],
  );

  const generatePlaybook = useCallback(async () => {
    setPending(true);
    try {
      const res = await fetch("/api/playbook/generate", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "playbook gen failed");
      showToast(
        `Playbook · ${data.result.entries} patterns from ${data.result.basedOnEvents} events (${data.result.source})`,
      );
      setPlaybookKey((k) => k + 1);
    } catch (err) {
      showToast(`Playbook gen failed: ${(err as Error).message}`, true);
    } finally {
      setPending(false);
    }
  }, [showToast]);

  const metrics = useMemo(() => {
    const state = activeQuery?.state;
    const active = state && !state.resolved ? 1 : 0;
    const slaRisk = state?.classification?.riskLabel ?? "—";
    const enterpriseAtRisk =
      state &&
      !state.resolved &&
      (state.account?.tier === "enterprise" || state.account?.tier === "strategic")
        ? 1
        : 0;
    const stuck = state?.failureNotes.length ?? 0;
    return { active, slaRisk, enterpriseAtRisk, stuck };
  }, [activeQuery]);

  const activeRecent = recent.find((w) => w.workflowId === activeId);
  const state = activeQuery?.state ?? null;
  const isInvestigating = state?.phase === "investigating";

  return (
    <main className="app">
      <Topbar />

      <section className="hero">
        <span className="eyebrow">Build with Temporal · Support & Services Ops</span>
        <h1>Run support escalations as if downstream tooling never failed.</h1>
        <p>
          Temporal owns the durable state, retries, signals, and audit trail. Claude does
          the reasoning — classification, agentic triage in a child workflow, customer-reply
          drafting, and cross-case playbook clustering. When BigQuery blips mid-run, the
          workflow remembers exactly where it is.
        </p>
      </section>

      <section className="metrics">
        <MetricCard
          label="Active escalations"
          value={metrics.active}
          hint={metrics.active ? "1 workflow in flight" : "Seed a ticket to begin"}
          icon={<IconActivity />}
        />
        <MetricCard
          label="SLA risk"
          value={metrics.slaRisk}
          hint="AI classification"
          icon={<IconAlert />}
        />
        <MetricCard
          label="Enterprise at risk"
          value={metrics.enterpriseAtRisk}
          hint="Tier enterprise/strategic + open"
          icon={<IconBuilding />}
        />
        <MetricCard
          label="Retried activities"
          value={metrics.stuck}
          hint={metrics.stuck ? "Temporal absorbed failures" : "No injected failures yet"}
          icon={<IconRotate />}
        />
      </section>

      <div className="grid-2">
        <section className="panel">
          <div className="panel-head">
            <h2>
              <IconActivity width={13} height={13} /> Active workflow
            </h2>
            {activeId ? <span className="meta">polling 1.5s</span> : null}
          </div>
          <WorkflowStatus
            workflowId={activeId ?? "—"}
            runStatus={activeQuery?.status}
            state={state}
            temporalUiUrl={activeRecent?.temporalUiUrl}
          />
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>Demo controls</h2>
          </div>
          <DemoControls
            activeWorkflowId={activeId}
            pending={pending}
            onSeed={seedTicket}
            onFailBigQuery={failBigQuery}
            onExecVisible={() => signal("markExecVisible", undefined, "mark exec-visible")}
            onChangePriority={() => signal("changePriority", "critical", "priority → critical")}
            onAssignOwner={() => signal("assignOwner", "Jordan Lee, Strategic CSM", "assign owner")}
            onResolve={() => signal("resolveCase", undefined, "resolve case")}
          />

          <div className="why">
            <strong>Why Temporal + Claude.</strong> The workflow is the agent. Claude does the
            reasoning; Temporal owns the durable state, retries, signals, and audit trail. When
            BigQuery fails, Temporal retries it. When the CSM approves the draft, that&rsquo;s a
            signal — not a webhook.
          </div>
        </section>
      </div>

      <InvestigationPanel investigation={state?.investigation} isInvestigating={isInvestigating} />
      <DraftPanel
        draft={state?.draftReply}
        pending={pending}
        onApprove={() => signal("approveDraft", undefined, "approve draft")}
        onEdit={(content) => signal("editDraft", content, "edit draft")}
      />
      <PlaybookPanel pending={pending} onGenerate={generatePlaybook} refreshKey={playbookKey} />

      <section className="panel">
        <div className="panel-head">
          <h2>Recent workflows</h2>
          <span className="meta">{recent.length} session{recent.length === 1 ? "" : "s"}</span>
        </div>
        {recent.length === 0 ? (
          <div className="empty">No workflows yet. Click &ldquo;Seed Acme AI ticket&rdquo;.</div>
        ) : (
          <div>
            <div className="workflow-row head">
              <div>WORKFLOW ID</div>
              <div>TICKET</div>
              <div>STARTED</div>
              <div style={{ textAlign: "right" }}>ACTIONS</div>
            </div>
            {recent.map((w) => (
              <div className="workflow-row" key={`${w.workflowId}-${w.runId}`}>
                <div className="id">{w.workflowId}</div>
                <div className="mono">{w.ticketId}</div>
                <div className="mono">{new Date(w.startedAt).toLocaleTimeString()}</div>
                <div className="row-actions">
                  <button
                    className="ghost"
                    onClick={() => setActiveId(w.workflowId)}
                    disabled={w.workflowId === activeId}
                  >
                    {w.workflowId === activeId ? (
                      <>
                        <IconCheck width={12} height={12} /> Active
                      </>
                    ) : (
                      <>
                        Focus <IconChevronRight width={12} height={12} />
                      </>
                    )}
                  </button>
                  <a href={w.temporalUiUrl} target="_blank" rel="noreferrer">
                    <button className="ghost">
                      <IconExternalLink width={12} height={12} /> Temporal
                    </button>
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {toast ? (
        <div className={`toast${toast.err ? " err" : " success"}`}>
          {toast.err ? <IconAlert width={14} height={14} /> : <IconCheck width={14} height={14} />}
          {toast.text}
        </div>
      ) : null}
    </main>
  );
}
