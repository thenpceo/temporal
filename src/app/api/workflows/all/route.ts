import { NextResponse } from "next/server";
import { listWorkflows } from "@/lib/state";
import { queryWorkflowState } from "@/temporal/client";

export const dynamic = "force-dynamic";

export async function GET() {
  const workflows = listWorkflows();
  const states = await Promise.all(
    workflows.map(async (w) => {
      const state = await queryWorkflowState(w.workflowId).catch(() => null);
      return { ...w, state };
    }),
  );
  return NextResponse.json({ workflows: states });
}
