"use client";

import type { WorkflowPhase } from "@/temporal/types";
import { IconCheck } from "./icons";

const ORDER: { phase: WorkflowPhase; label: string }[] = [
  { phase: "received", label: "received" },
  { phase: "enriched", label: "enriched" },
  { phase: "classified", label: "classified" },
  { phase: "case_created", label: "case" },
  { phase: "notified", label: "slack" },
  { phase: "investigating", label: "triage" },
  { phase: "drafting_reply", label: "draft" },
  { phase: "awaiting_approval", label: "approval" },
  { phase: "waiting_for_resolution", label: "resolve" },
  { phase: "resolved", label: "done" },
];

interface Props {
  phase: WorkflowPhase;
  hasInvestigation: boolean;
  hasDraft: boolean;
}

export function PhaseTimeline({ phase, hasInvestigation, hasDraft }: Props) {
  const idx = ORDER.findIndex((s) => s.phase === phase);

  return (
    <div className="timeline">
      {ORDER.map((step, i) => {
        // Tri-state status: done > active > pending. We also derive a "skipped"
        // state for steps the workflow chose not to enter (e.g. `investigating`
        // on a non-executive ticket): when the phase pointer has moved past a
        // step but its corresponding state never appeared, render it as a
        // dim "skipped" rather than a confident check.
        let status: "done" | "active" | "pending" | "skipped";
        if (i === idx) {
          status = "active";
        } else if (i < idx) {
          if (step.phase === "investigating" && !hasInvestigation) {
            status = "skipped";
          } else if (
            (step.phase === "drafting_reply" ||
              step.phase === "awaiting_approval") &&
            !hasDraft &&
            phase === "resolved"
          ) {
            // very rare: workflow resolved before drafting completed
            status = "skipped";
          } else {
            status = "done";
          }
        } else {
          status = "pending";
        }

        return (
          <div key={step.phase} style={{ display: "contents" }}>
            <div className={`timeline-step ${status}`}>
              <div className="node">
                {status === "done" ? <IconCheck width={10} height={10} /> : null}
              </div>
              <div className="label">{step.label}</div>
            </div>
            {i < ORDER.length - 1 ? (
              <div className={`timeline-edge ${i < idx ? "done" : ""}`} />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
