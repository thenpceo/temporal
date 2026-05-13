import { NextResponse } from "next/server";
import { listWorkflows } from "@/lib/state";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ workflows: listWorkflows() });
}
