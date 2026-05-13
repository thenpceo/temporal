import { NextResponse } from "next/server";
import { signalWorkflow, type SignalName } from "@/temporal/client";

export const dynamic = "force-dynamic";

const validSignals: SignalName[] = [
  "markExecVisible",
  "changePriority",
  "assignOwner",
  "resolveCase",
  "approveDraft",
  "editDraft",
];

export async function POST(
  req: Request,
  { params }: { params: Promise<{ workflowId: string }> },
) {
  const { workflowId } = await params;
  const body = (await req.json().catch(() => null)) as {
    signal?: SignalName;
    value?: unknown;
  } | null;

  if (!body?.signal || !validSignals.includes(body.signal)) {
    return NextResponse.json(
      { error: `Invalid signal. Expected one of: ${validSignals.join(", ")}` },
      { status: 400 },
    );
  }

  try {
    await signalWorkflow(workflowId, body.signal, body.value);
    return NextResponse.json({ ok: true, signal: body.signal });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
