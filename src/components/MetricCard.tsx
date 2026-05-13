import type { ReactNode } from "react";

interface Props {
  label: string;
  value: string | number;
  hint?: string;
  icon?: ReactNode;
}

export function MetricCard({ label, value, hint, icon }: Props) {
  return (
    <div className="metric">
      <div className="metric-head">
        <span>{label}</span>
        {icon ? <span className="icon">{icon}</span> : null}
      </div>
      <div className="value">{value}</div>
      {hint ? <div className="hint">{hint}</div> : null}
    </div>
  );
}
