import Link from "next/link";
import { Topbar } from "@/components/Topbar";
import { StatusIndex } from "@/components/StatusIndex";

export const dynamic = "force-dynamic";

export default function StatusIndexPage() {
  return (
    <main className="app">
      <Topbar />
      <section className="hero">
        <span className="eyebrow">Customer · Acme AI</span>
        <h1>The customer sees one thing: their inbox.</h1>
        <p>
          There&apos;s no portal, no login, no &ldquo;case #42&rdquo;. Just an email
          thread that arrives in <span className="mono">mira@acme-ai.example</span> —
          generated from the running Temporal workflow, including the AI-drafted reply
          once the CSM has approved it.
        </p>
      </section>
      <StatusIndex />
      <div className="why" style={{ margin: "1.5rem" }}>
        Public-facing pages are a query against the same workflow state ops sees.
        One source of truth — different projections.{" "}
        <Link href="/">Back to ops</Link>.
      </div>
    </main>
  );
}
