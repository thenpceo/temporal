import { promises as fs } from "node:fs";
import path from "node:path";

export type SignalAudience = "product" | "enablement" | "ops";

export interface SignalRouting {
  audience: SignalAudience;
  team: string;
  channel: string;
  artifact: string;
}

export interface PlaybookEntry {
  pattern: string;
  signals: string[];
  signalsFor?: SignalAudience[];
  recommendedAction: string;
  recommendedRouting?: string;
  confidence: "low" | "medium" | "high";
  routings?: SignalRouting[];
}

export interface StoredPlaybook {
  generatedAt: string;
  basedOnEvents: number;
  summary: string;
  entries: PlaybookEntry[];
}

const PLAYBOOK_PATH = path.join(process.cwd(), ".playbook.json");

export async function savePlaybook(playbook: StoredPlaybook): Promise<void> {
  await fs.writeFile(PLAYBOOK_PATH, JSON.stringify(playbook, null, 2));
}

export async function loadPlaybook(): Promise<StoredPlaybook | null> {
  try {
    const raw = await fs.readFile(PLAYBOOK_PATH, "utf8");
    return JSON.parse(raw) as StoredPlaybook;
  } catch {
    return null;
  }
}

export async function loadPlaybookText(): Promise<string | undefined> {
  const playbook = await loadPlaybook();
  if (!playbook) return undefined;
  const lines: string[] = [
    `Playbook (generated ${playbook.generatedAt}, based on ${playbook.basedOnEvents} prior events):`,
    `Summary: ${playbook.summary}`,
  ];
  for (const e of playbook.entries) {
    lines.push(
      `- Pattern: ${e.pattern} [${e.confidence} confidence]`,
      `  Signals for: ${(e.signalsFor ?? ["ops"]).join(", ")}`,
      `  Signals: ${e.signals.join(", ")}`,
      `  Recommended action: ${e.recommendedAction}`,
    );
    if (e.recommendedRouting) {
      lines.push(`  Recommended routing: ${e.recommendedRouting}`);
    }
    if (e.routings) {
      for (const r of e.routings) {
        lines.push(`  Routing -> ${r.audience} (${r.team} via ${r.channel}): ${r.artifact}`);
      }
    }
  }
  return lines.join("\n");
}
