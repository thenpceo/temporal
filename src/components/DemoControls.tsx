"use client";

import {
  IconPlay,
  IconCheck,
  IconShield,
  IconAlert,
  IconUsers,
  IconBolt,
  IconRotate,
} from "./icons";

interface Props {
  activeWorkflowId?: string;
  onSeed: () => void | Promise<void>;
  onFailBigQuery: () => void | Promise<void>;
  onExecVisible: () => void | Promise<void>;
  onChangePriority: () => void | Promise<void>;
  onAssignOwner: () => void | Promise<void>;
  onResolve: () => void | Promise<void>;
  pending?: boolean;
}

export function DemoControls({
  activeWorkflowId,
  onSeed,
  onFailBigQuery,
  onExecVisible,
  onChangePriority,
  onAssignOwner,
  onResolve,
  pending,
}: Props) {
  const hasActive = Boolean(activeWorkflowId);
  return (
    <div>
      <div className="controls-group">
        <div className="controls-group-label">
          <IconPlay width={11} height={11} /> Lifecycle
        </div>
        <div className="controls-row">
          <button className="cta" onClick={onSeed} disabled={pending}>
            <IconPlay width={13} height={13} /> Seed Acme AI ticket
          </button>
          <button onClick={onResolve} disabled={pending || !hasActive}>
            <IconCheck width={13} height={13} /> Resolve case
          </button>
        </div>
      </div>

      <div className="controls-group">
        <div className="controls-group-label">
          <IconShield width={11} height={11} /> Workflow signals
        </div>
        <div className="controls-row">
          <button onClick={onExecVisible} disabled={pending || !hasActive}>
            <IconAlert width={13} height={13} /> markExecVisible
          </button>
          <button onClick={onChangePriority} disabled={pending || !hasActive}>
            <IconBolt width={13} height={13} /> changePriority(critical)
          </button>
          <button onClick={onAssignOwner} disabled={pending || !hasActive}>
            <IconUsers width={13} height={13} /> assignOwner
          </button>
        </div>
      </div>

      <div className="controls-group">
        <div className="controls-group-label">
          <IconRotate width={11} height={11} /> Chaos
        </div>
        <div className="controls-row">
          <button onClick={onFailBigQuery} disabled={pending}>
            <IconRotate width={13} height={13} /> Fail next BigQuery write
          </button>
        </div>
      </div>
    </div>
  );
}
