import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { clearWorkflows } from "@/lib/state";

export const dynamic = "force-dynamic";

export async function POST() {
  const clearedWorkflows = clearWorkflows();

  const filesAttempted = [".playbook.json", ".bigquery-fail-next"];
  const filesCleared: string[] = [];
  for (const f of filesAttempted) {
    try {
      await fs.unlink(path.join(process.cwd(), f));
      filesCleared.push(f);
    } catch {
      // file didn't exist — fine
    }
  }

  return NextResponse.json({
    ok: true,
    clearedWorkflows,
    filesCleared,
    note:
      "Recent-workflows list cleared. To also wipe Temporal workflow history, restart the Temporal dev server.",
  });
}
