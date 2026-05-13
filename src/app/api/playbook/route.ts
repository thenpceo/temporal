import { NextResponse } from "next/server";
import { loadPlaybook } from "@/lib/playbook";

export const dynamic = "force-dynamic";

export async function GET() {
  const playbook = await loadPlaybook();
  return NextResponse.json({ playbook });
}
