"use client";

import { useEffect, useState, useCallback } from "react";
import type { StoredPlaybook } from "@/lib/playbook";
import { IconBookOpen, IconRefresh, IconSpark } from "./icons";

interface Props {
  pending: boolean;
  onGenerate: () => void | Promise<void>;
  refreshKey?: number;
}

export function PlaybookPanel({ pending, onGenerate, refreshKey }: Props) {
  const [playbook, setPlaybook] = useState<StoredPlaybook | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/playbook", { cache: "no-store" });
      const data = (await res.json()) as { playbook: StoredPlaybook | null };
      setPlaybook(data.playbook);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh, refreshKey]);

  return (
    <section className="panel" style={{ marginTop: "1rem" }}>
      <div className="panel-head">
        <h2>
          <IconBookOpen width={13} height={13} /> Cross-case AI playbook
        </h2>
        <button onClick={onGenerate} disabled={pending} className="ghost">
          {playbook ? <IconRefresh width={13} height={13} /> : <IconSpark width={13} height={13} />}
          {playbook ? "Regenerate" : "Generate playbook"}
        </button>
      </div>

      {loading ? (
        <div style={{ display: "grid", gap: "0.4rem" }}>
          <div className="skeleton" style={{ height: 28 }} />
          <div className="skeleton" style={{ height: 60 }} />
        </div>
      ) : !playbook ? (
        <div className="empty">
          <div style={{ marginBottom: "0.4rem", color: "var(--text-2)" }}>No playbook yet</div>
          Run a few escalations, then click <strong>Generate playbook</strong> to start{" "}
          <span className="mono">PlaybookGenerationWorkflow</span>. The next escalation workflow
          will load it as classification context.
        </div>
      ) : (
        <div className="fade-in">
          <div className="meta" style={{ marginBottom: "0.55rem" }}>
            generated {new Date(playbook.generatedAt).toLocaleTimeString()} ·{" "}
            {playbook.basedOnEvents} events · {playbook.entries.length} patterns
          </div>
          <div className="playbook-summary">{playbook.summary}</div>
          <div className="playbook-entries">
            {playbook.entries.map((e, i) => (
              <div key={i} className="playbook-entry">
                <div className="playbook-entry-head">
                  <strong>{e.pattern}</strong>
                  <span
                    className={`pill ${e.confidence === "high" ? "normal" : e.confidence === "medium" ? "watch" : ""}`}
                  >
                    {e.confidence}
                  </span>
                </div>
                <div
                  className="muted"
                  style={{ fontSize: "0.8rem", marginTop: "0.3rem" }}
                >
                  signals: {e.signals.join(" · ")}
                </div>
                <div
                  className="muted"
                  style={{ fontSize: "0.78rem", marginTop: "0.35rem" }}
                >
                  signals for: {(e.signalsFor ?? ["ops"]).join(" · ")}
                </div>
                <div style={{ fontSize: "0.86rem", marginTop: "0.4rem", color: "var(--text-2)" }}>
                  {e.recommendedAction}
                </div>
                {e.recommendedRouting ? (
                  <div
                    style={{
                      fontSize: "0.84rem",
                      marginTop: "0.45rem",
                      color: "var(--accent-2)",
                    }}
                  >
                    recommended routing: {e.recommendedRouting}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
