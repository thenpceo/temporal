import { Topbar } from "@/components/Topbar";
import { PylonAgentView } from "@/components/PylonAgentView";

export const dynamic = "force-dynamic";

export default async function PylonTicketPage({
  params,
}: {
  params: Promise<{ workflowId: string }>;
}) {
  const { workflowId } = await params;
  return (
    <main className="app">
      <Topbar />
      <PylonAgentView workflowId={decodeURIComponent(workflowId)} />
    </main>
  );
}
