import { NextResponse } from "next/server";
import { runPlaybookGeneration } from "@/temporal/client";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const data = await runPlaybookGeneration();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message, hint: "Is the Temporal worker running?" },
      { status: 500 },
    );
  }
}
