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
  const steps = ORDER.filter((s) => {
    if (s.phase === "investigating" && !hasInvestigation) return false;
    if (s.phase === "drafting_reply" && !hasDraft) return false;
    if (s.phase === "awaiting_approval" && !hasDraft) return false;
    return true;
  });

  const idx = steps.findIndex((s) => s.phase === phase);

  return (
    <div className="timeline">
      {steps.map((step, i) => {
        const status = i < idx ? "done" : i === idx ? "active" : "pending";
        return (
          <div key={step.phase} style={{ display: "contents" }}>
            <div className={`timeline-step ${status}`}>
              <div className="node">
                {status === "done" ? <IconCheck width={10} height={10} /> : null}
              </div>
              <div className="label">{step.label}</div>
            </div>
            {i < steps.length - 1 ? (
              <div className={`timeline-edge ${i < idx ? "done" : ""}`} />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
