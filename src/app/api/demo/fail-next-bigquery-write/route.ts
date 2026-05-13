import { NextResponse } from "next/server";
import { armBigQueryFailure, isBigQueryArmed } from "@/adapters/bigquery";

export const dynamic = "force-dynamic";

export async function POST() {
  await armBigQueryFailure();
  return NextResponse.json({
    ok: true,
    armed: await isBigQueryArmed(),
    message: "Next BigQuery write will fail once. Temporal will retry automatically.",
  });
}

export async function GET() {
  return NextResponse.json({ armed: await isBigQueryArmed() });
}
