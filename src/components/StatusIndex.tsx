"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { SupportEscalationState } from "@/temporal/types";
import { IconChevronRight } from "./icons";

interface WorkflowWithState {
  workflowId: string;
  startedAt: string;
  state: SupportEscalationState | null;
}

export function StatusIndex() {
  const [items, setItems] = useState<WorkflowWithState[]>([]);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/workflows/all", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as { workflows: WorkflowWithState[] };
    setItems(data.workflows);
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 3000);
    return () => clearInterval(t);
  }, [refresh]);

  if (items.length === 0) {
    return (
      <div className="empty" style={{ margin: "1.5rem", border: "var(--line)" }}>
        No cases yet. Seed one from the Ops view.
      </div>
    );
  }

  return (
    <section className="panel" style={{ padding: 0 }}>
      <div className="panel-head" style={{ padding: "1rem 1.5rem", borderBottom: "var(--line)", margin: 0 }}>
        <h2>Open cases</h2>
      </div>
      {items.map((w) => {
        const s = w.state;
        if (!s) return null;
        const stateLabel = s.resolved ? "resolved" : s.phase === "investigating" ? "investigating" : "in_progress";
        return (
          <Link
            key={w.workflowId}
            href={`/status/${encodeURIComponent(w.workflowId)}`}
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <div className="queue-row" style={{ gridTemplateColumns: "1fr auto auto" }}>
              <div>
                <div className="acct">{s.account?.name ?? "—"}</div>
                <div className="sub">{s.ticket?.subject ?? w.workflowId}</div>
              </div>
              <div>
                <span className={`pill ${s.resolved ? "normal" : s.classification?.riskLabel ?? "watch"}`}>
                  {stateLabel.replace("_", " ")}
                </span>
              </div>
              <span style={{ color: "var(--muted)" }}>
                <IconChevronRight width={16} height={16} />
              </span>
            </div>
          </Link>
        );
      })}
    </section>
  );
}
