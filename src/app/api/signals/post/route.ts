import { NextResponse } from "next/server";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

interface PostBody {
  pattern: string;
  confidence: "low" | "medium" | "high";
  routing: {
    audience: "product" | "enablement" | "ops";
    team: string;
    channel: string;
    artifact: string;
  };
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as PostBody | null;
  if (!body?.routing) {
    return NextResponse.json({ error: "missing routing" }, { status: 400 });
  }
  const routing = {
    ...body.routing,
    channel:
      body.routing.audience === "product"
        ? "#product-feedback"
        : body.routing.channel,
  };
  const normalizedBody = { ...body, routing };

  const message = formatSignalMessage(normalizedBody);

  if (env.slackWebhookUrl) {
    try {
      const res = await fetch(env.slackWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: message }),
      });
      if (!res.ok) {
        return NextResponse.json(
          { error: `Slack webhook returned ${res.status}` },
          { status: 500 },
        );
      }
      return NextResponse.json({ ok: true, channel: routing.channel, delivery: "slack" });
    } catch (err) {
      return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
  }

  console.log(`\n[signals:${body.routing.audience}]\n${message}\n`);
  return NextResponse.json({
    ok: true,
    channel: routing.channel,
    delivery: "log",
  });
}

function formatSignalMessage(body: PostBody): string {
  const r = body.routing;
  return [
    `📡 ${r.audience.toUpperCase()} SIGNAL · routed by Service Ops`,
    `Pattern: ${body.pattern} (${body.confidence} confidence)`,
    `Team: ${r.team}`,
    `Artifact: ${r.artifact}`,
  ].join("\n");
}
