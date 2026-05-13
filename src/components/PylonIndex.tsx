"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { SupportEscalationState } from "@/temporal/types";
import { IconChevronRight, IconMessage } from "./icons";

interface WorkflowWithState {
  workflowId: string;
  startedAt: string;
  state: SupportEscalationState | null;
}

export function PylonIndex() {
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
        Pylon inbox empty. Seed a ticket from Ops.
      </div>
    );
  }

  return (
    <section className="panel" style={{ padding: 0 }}>
      <div className="panel-head" style={{ padding: "1rem 1.5rem", borderBottom: "var(--line)", margin: 0 }}>
        <h2><IconMessage width={13} height={13} /> Inbox</h2>
        <span className="meta">{items.length} ticket{items.length === 1 ? "" : "s"}</span>
      </div>
      {items.map((w) => {
        const s = w.state;
        if (!s) return null;
        const risk = s.classification?.riskLabel ?? "normal";
        return (
          <Link
            key={w.workflowId}
            href={`/pylon/${encodeURIComponent(w.workflowId)}`}
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <div className="queue-row" style={{ gridTemplateColumns: "auto 1fr auto auto" }}>
              <span className={`pill ${risk}`}>{risk}</span>
              <div>
                <div className="acct">{s.ticket?.subject ?? "—"}</div>
                <div className="sub">
                  {s.ticket?.requesterEmail ?? "—"} · {s.account?.name}
                </div>
              </div>
              <span className="mono" style={{ color: "var(--muted)" }}>
                #{s.ticket?.id.slice(-12) ?? "—"}
              </span>
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
