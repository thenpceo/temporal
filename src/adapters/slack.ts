import type { SupportEscalationState } from "../temporal/types";
import { env, buildTemporalUiUrl } from "../lib/env";

const slackLog: Array<{ at: string; eventType: string; message: string; threadUrl: string }> = [];

export function getSlackLog(): ReadonlyArray<{
  at: string;
  eventType: string;
  message: string;
  threadUrl: string;
}> {
  return slackLog;
}

function formatMessage(state: SupportEscalationState, eventType: string): string {
  const ticket = state.ticket;
  const account = state.account;
  const cls = state.classification;
  const priority = state.priorityOverride ?? ticket?.priority ?? "n/a";
  const lines: string[] = [];

  if (eventType === "exec_visible") {
    lines.push(`👀 Exec-visible escalation: ${account?.name ?? "Unknown account"}`);
  } else if (eventType === "priority_changed") {
    lines.push(`⚠️  Priority updated → ${priority.toUpperCase()} for ${account?.name ?? "Unknown account"}`);
  } else {
    lines.push(`🚨 Support escalation: ${account?.name ?? "Unknown account"}`);
  }

  if (cls) {
    lines.push(`Risk: ${cls.riskLabel} (score ${cls.riskScore})`);
  }
  if (ticket) {
    lines.push(`SLA: ${ticket.slaMinutesRemaining} minutes remaining`);
  }
  if (account) {
    lines.push(
      `Account: ${account.tier}, ${account.arrBand}${
        account.renewalDate ? `, renewal ${account.renewalDate}` : ""
      }`,
    );
  }
  if (ticket) {
    lines.push(`Issue: ${ticket.subject}`);
  }
  if (cls) {
    lines.push(`Recommended action: ${cls.recommendedAction}`);
  }
  if (state.assignedOwner) {
    lines.push(`Assigned to: ${state.assignedOwner}`);
  }
  lines.push(`Workflow: ${buildTemporalUiUrl(state.workflowId)}`);

  return lines.join("\n");
}

export async function sendSlackEscalation(
  state: SupportEscalationState,
  eventType: string,
): Promise<string> {
  const message = formatMessage(state, eventType);
  const fakeThreadUrl = `https://slack.example.com/archives/CDEMO/p${Date.now()}`;

  if (env.slackWebhookUrl) {
    try {
      const res = await fetch(env.slackWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: message }),
      });
      if (!res.ok) {
        throw new Error(`Slack webhook returned ${res.status}`);
      }
    } catch (err) {
      console.warn("[slack] webhook failed, falling back to log", err);
    }
  }

  console.log(`\n[slack:${eventType}]\n${message}\n`);
  slackLog.push({
    at: new Date().toISOString(),
    eventType,
    message,
    threadUrl: state.slackThreadUrl ?? fakeThreadUrl,
  });
  return state.slackThreadUrl ?? fakeThreadUrl;
}
