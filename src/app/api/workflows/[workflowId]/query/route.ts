import { NextResponse } from "next/server";
import { describeWorkflow, queryWorkflowState } from "@/temporal/client";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ workflowId: string }> },
) {
  const { workflowId } = await params;
  try {
    const state = await queryWorkflowState(workflowId);
    let status: string | undefined;
    let runId: string | undefined;
    try {
      const desc = await describeWorkflow(workflowId);
      status = desc.status.name;
      runId = desc.runId;
    } catch {
      // ignore
    }
    return NextResponse.json({ workflowId, runId, status, state });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
