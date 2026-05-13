import { NextResponse } from "next/server";
import { startSupportEscalation } from "@/temporal/client";
import { recordWorkflow } from "@/lib/state";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let ticketId = "ticket-acme-latency-001";
  try {
    const body = (await req.json().catch(() => null)) as { ticketId?: string } | null;
    if (body?.ticketId) ticketId = body.ticketId;
  } catch {
    // ignore
  }

  try {
    const result = await startSupportEscalation({ ticketId, source: "demo" });
    recordWorkflow({
      workflowId: result.workflowId,
      runId: result.runId,
      ticketId,
      startedAt: new Date().toISOString(),
      temporalUiUrl: result.temporalUiUrl,
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message, hint: "Is the Temporal dev server and worker running?" },
      { status: 500 },
    );
  }
}
