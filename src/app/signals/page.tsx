import { Topbar } from "@/components/Topbar";
import { ProductSignals } from "@/components/ProductSignals";

export const dynamic = "force-dynamic";

export default function SignalsPage() {
  return (
    <main className="app">
      <Topbar />
      <section className="hero">
        <span className="eyebrow">Product · Data Analytics · Enablement</span>
        <h1>Patterns Support sees first. The signal Product and Enablement need.</h1>
        <p>
          Cross-case clustering from the same Temporal event log the playbook reads,
          but split by audience: which patterns are an SDK or UI change waiting to
          happen, which are an enablement gap, and which stay internal to support
          ops. Each routing has a target team, a channel, and the concrete artifact
          to ship.
        </p>
      </section>
      <ProductSignals />
    </main>
  );
}
