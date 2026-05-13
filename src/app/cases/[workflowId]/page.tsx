import Link from "next/link";
import { CaseDetail } from "@/components/CaseDetail";
import { Topbar } from "@/components/Topbar";
import { IconArrowLeft } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function CasePage({
  params,
}: {
  params: Promise<{ workflowId: string }>;
}) {
  const { workflowId } = await params;
  return (
    <main className="app">
      <Topbar />
      <Link href="/" className="back">
        <IconArrowLeft width={14} height={14} /> Ops command center
      </Link>
      <section className="hero">
        <span className="eyebrow">Internal · case detail</span>
        <h1>{decodeURIComponent(workflowId)}</h1>
      </section>
      <div style={{ padding: "1.5rem" }}>
        <CaseDetail workflowId={decodeURIComponent(workflowId)} />
      </div>
    </main>
  );
}
