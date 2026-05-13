import { Topbar } from "@/components/Topbar";
import { CustomerStatus } from "@/components/CustomerStatus";

export const dynamic = "force-dynamic";

export default async function StatusPage({
  params,
}: {
  params: Promise<{ workflowId: string }>;
}) {
  const { workflowId } = await params;
  return (
    <main className="app">
      <Topbar />
      <CustomerStatus workflowId={decodeURIComponent(workflowId)} />
    </main>
  );
}
