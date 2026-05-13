import { Topbar } from "@/components/Topbar";
import { ExecView } from "@/components/ExecView";

export const dynamic = "force-dynamic";

export default function ExecPage() {
  return (
    <main className="app">
      <Topbar />
      <section className="hero">
        <span className="eyebrow">Executive · Slack-first</span>
        <h1>Execs see this in Slack, not in a dashboard.</h1>
        <p>
          When a CSM flags an escalation exec-visible, the workflow auto-posts to{" "}
          <span className="mono">#exec-escalations</span> with the customer, ARR band,
          renewal date, and SLA. Plus a Friday rollup email that summarizes the week.
          Numbers below are scaffolding for the CRO 1:1 — not where the signal lives.
        </p>
      </section>
      <ExecView />
    </main>
  );
}
