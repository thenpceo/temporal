import { Topbar } from "@/components/Topbar";
import { CSMInbox } from "@/components/CSMInbox";

export const dynamic = "force-dynamic";

export default function CSMPage() {
  return (
    <main className="app">
      <Topbar />
      <section className="hero">
        <span className="eyebrow">CSM · Jordan Lee · Strategic accounts</span>
        <h1>Slack first. Queue second. Both wired to the same workflow.</h1>
        <p>
          The first thing a CSM gets is an @-mention in their account channel
          (<span className="mono">#cs-acme-ai</span>) with{" "}
          <span className="mono">[Approve]</span> and{" "}
          <span className="mono">[Escalate]</span> buttons. The queue below is their
          working surface — both are projections of the same Temporal workflow state.
        </p>
      </section>
      <CSMInbox />
    </main>
  );
}
