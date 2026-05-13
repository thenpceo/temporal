import { Topbar } from "@/components/Topbar";
import { PylonIndex } from "@/components/PylonIndex";

export const dynamic = "force-dynamic";

export default function PylonPage() {
  return (
    <main className="app">
      <Topbar />
      <section className="hero">
        <span className="eyebrow">Support tooling · Pylon</span>
        <h1>What the support agent sees in their ticketing tool.</h1>
        <p>
          The existing surface a Tier-2 support engineer already lives in. Same
          workflow state, projected to the &ldquo;ticket open in front of them&rdquo;
          lens. The Temporal workflow shows up as a side panel they can act on
          without context-switching.
        </p>
      </section>
      <PylonIndex />
    </main>
  );
}
