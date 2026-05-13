import { NextResponse } from "next/server";
import { getClient } from "@/temporal/client";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET() {
  let workerConnected = false;
  let temporalReachable = false;
  try {
    const client = await getClient();
    const desc = await client.workflowService.describeTaskQueue({
      namespace: env.temporalNamespace,
      taskQueue: { name: env.temporalTaskQueue, kind: 1 },
    });
    temporalReachable = true;
    workerConnected = (desc.pollers ?? []).length > 0;
  } catch {
    // server unreachable
  }

  return NextResponse.json({
    llmMode: process.env.ANTHROPIC_API_KEY ? "live" : "mock",
    model: "claude-opus-4-7",
    temporalReachable,
    workerConnected,
    taskQueue: env.temporalTaskQueue,
  });
}
