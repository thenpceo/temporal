"use client";

import type { ReactNode } from "react";
import type { SupportEscalationState } from "@/temporal/types";

interface Props {
  channel: string;
  topic: string;
  state: SupportEscalationState | null;
  audience: "csm" | "exec";
}

interface SlackMsg {
  id: string;
  who: string;
  initials: string;
  bot?: boolean;
  time: string;
  body?: ReactNode;
  attachment?: {
    title: string;
    color: "danger" | "warn" | "ok" | "info";
    fields: { label: string; value: string }[];
    text?: string;
    actions?: { label: string; primary?: boolean }[];
  };
  reactions?: { emoji: string; count: number }[];
  thread?: number;
}

export function SlackChannel({ channel, topic, state, audience }: Props) {
  const messages = buildMessages(state, audience);

  return (
    <section className="slack-channel">
      <div className="slack-channel-head">
        <span style={{ color: "#888b8e" }}>#</span>
        {channel}
        <span className="topic">{topic}</span>
      </div>

      {messages.length === 0 ? (
        <div style={{ padding: "1.5rem", color: "#888b8e", fontSize: "0.9rem" }}>
          (no activity yet — seed a ticket from Ops to populate this channel)
        </div>
      ) : (
        messages.map((m) => (
          <div className="slack-message" key={m.id}>
            <div className={`slack-avatar${m.bot ? " bot" : ""}`}>{m.initials}</div>
            <div>
              <div className="slack-message-head">
                <span className="slack-name">{m.who}</span>
                {m.bot ? <span className="slack-bot-tag">APP</span> : null}
                <span className="slack-time">{m.time}</span>
              </div>
              {m.body ? <div className="slack-body">{m.body}</div> : null}
              {m.attachment ? (
                <div className={`slack-attachment ${m.attachment.color}`}>
                  <div className="slack-attachment-title">{m.attachment.title}</div>
                  {m.attachment.text ? (
                    <div style={{ marginBottom: "0.35rem", color: "#d1d2d3" }}>
                      {m.attachment.text}
                    </div>
                  ) : null}
                  <div>
                    {m.attachment.fields.map((f, i) => (
                      <span key={i} className="slack-attachment-field">
                        <span className="lab">{f.label}</span>
                        {f.value}
                      </span>
                    ))}
                  </div>
                  {m.attachment.actions ? (
                    <div className="slack-actions">
                      {m.attachment.actions.map((a, i) => (
                        <button key={i} className={`slack-btn${a.primary ? " primary" : ""}`}>
                          {a.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
              {m.reactions ? (
                <div className="slack-reactions">
                  {m.reactions.map((r, i) => (
                    <span key={i} className="slack-reaction">
                      {r.emoji} {r.count}
                    </span>
                  ))}
                </div>
              ) : null}
              {m.thread ? (
                <div className="slack-thread-link">
                  💬 {m.thread} {m.thread === 1 ? "reply" : "replies"} · last from Workflow Bot
                </div>
              ) : null}
            </div>
          </div>
        ))
      )}
    </section>
  );
}

function buildMessages(
  state: SupportEscalationState | null,
  audience: "csm" | "exec",
): SlackMsg[] {
  if (!state || !state.ticket || !state.account) return [];

  const msgs: SlackMsg[] = [];
  const risk = state.classification?.riskLabel ?? "normal";
  const color = risk === "executive" ? "danger" : risk === "urgent" ? "warn" : "info";
  const owner = (state.assignedOwner ?? state.classification?.recommendedOwner ?? "Support Ops")
    .split(",")[0];
  const started = new Date(state.ticket.createdAt);
  const ts = (offsetMin: number) =>
    new Date(started.getTime() + offsetMin * 60_000).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

  if (audience === "csm") {
    msgs.push({
      id: "wf-start",
      who: "Service Ops",
      initials: "SO",
      bot: true,
      time: ts(0),
      attachment: {
        title: `New escalation · ${state.account.name}`,
        color,
        fields: [
          { label: "Risk", value: risk.toUpperCase() },
          { label: "SLA", value: `${state.ticket.slaMinutesRemaining}m remaining` },
          { label: "Tier", value: state.account.tier },
          { label: "Open opp", value: state.account.openOpportunity ? "yes" : "no" },
        ],
        text: state.ticket.subject,
        actions: state.draftReply
          ? [
              {
                label:
                  state.draftReply.status === "approved" ? "✓ Draft sent" : "Approve draft",
                primary: state.draftReply.status !== "approved",
              },
              { label: "Mark exec-visible" },
            ]
          : [{ label: "Open in Pylon" }],
      },
      thread: state.investigation ? 3 : 1,
    });

    if (state.investigation) {
      msgs.push({
        id: "wf-triage",
        who: "Workflow Bot",
        initials: "WB",
        bot: true,
        time: ts(1),
        body: (
          <>
            AI triage finished on{" "}
            <span className="slack-mention">@{owner.toLowerCase().replace(/\s+/g, "")}</span>
            &apos;s case. {state.investigation.toolCalls} tool calls in{" "}
            {state.investigation.durationMs}ms. Findings in thread.
          </>
        ),
        reactions: [
          { emoji: "👀", count: 2 },
          { emoji: "🙏", count: 1 },
        ],
      });
    }

    if (state.execVisible) {
      msgs.push({
        id: "wf-exec",
        who: "Jordan Lee",
        initials: "JL",
        time: ts(3),
        body: (
          <>
            Flagging this exec-visible — Acme&apos;s exec sponsor messaged me. Cross-posting to{" "}
            <span className="slack-mention">#exec-escalations</span>.
          </>
        ),
        reactions: [{ emoji: "✅", count: 1 }],
      });
    }

    if (state.draftReply?.status === "approved") {
      msgs.push({
        id: "wf-sent",
        who: "Service Ops",
        initials: "SO",
        bot: true,
        time: ts(5),
        body: (
          <>
            Draft reply approved by{" "}
            <span className="slack-mention">@{owner.toLowerCase().replace(/\s+/g, "")}</span>{" "}
            and sent to {state.ticket.requesterEmail}. ✉️
          </>
        ),
      });
    }

    if (state.resolved) {
      msgs.push({
        id: "wf-done",
        who: "Service Ops",
        initials: "SO",
        bot: true,
        time: ts(8),
        body: <>Case resolved. Workflow complete. ✅</>,
        reactions: [{ emoji: "🎉", count: 4 }],
      });
    }
  } else {
    // exec channel — only fires when exec-visible
    if (!state.execVisible && state.classification?.riskLabel !== "executive") {
      return [
        {
          id: "quiet",
          who: "Service Ops",
          initials: "SO",
          bot: true,
          time: "—",
          body: (
            <span style={{ color: "#888b8e" }}>
              Channel is quiet. No escalation has been marked exec-visible.
            </span>
          ),
        },
      ];
    }

    msgs.push({
      id: "exec-start",
      who: "Service Ops",
      initials: "SO",
      bot: true,
      time: ts(0),
      body: (
        <>
          🚨 <span className="slack-mention">@here</span> · exec-visible escalation. Posted by{" "}
          <span className="slack-mention">@{owner.toLowerCase().replace(/\s+/g, "")}</span> in
          <span className="slack-mention"> #cs-acme-ai</span>.
        </>
      ),
      attachment: {
        title: `${state.account.name} · ${state.account.tier} · ${state.account.arrBand}`,
        color: "danger",
        fields: [
          { label: "Risk", value: (state.classification?.riskLabel ?? "—").toUpperCase() },
          { label: "SLA remaining", value: `${state.ticket.slaMinutesRemaining}m` },
          { label: "Renewal", value: state.account.renewalDate ?? "—" },
          { label: "Owner", value: owner },
        ],
        text: state.ticket.subject,
        actions: [
          { label: "Open case", primary: true },
          { label: "View in Temporal" },
        ],
      },
      reactions: [
        { emoji: "👀", count: 3 },
        { emoji: "🙏", count: 1 },
      ],
    });

    if (state.draftReply?.status === "approved") {
      msgs.push({
        id: "exec-comms",
        who: "Workflow Bot",
        initials: "WB",
        bot: true,
        time: ts(5),
        body: (
          <>
            Customer comms sent at {ts(5)}.{" "}
            <span className="slack-mention">@{owner.toLowerCase().replace(/\s+/g, "")}</span> is
            on point.
          </>
        ),
      });
    }

    if (state.resolved) {
      msgs.push({
        id: "exec-resolved",
        who: "Workflow Bot",
        initials: "WB",
        bot: true,
        time: ts(8),
        body: (
          <>
            <strong>Resolved.</strong> Time to resolution: 8m. RCA postmortem will land in{" "}
            <span className="slack-mention">#postmortems</span> by EOW.
          </>
        ),
        reactions: [{ emoji: "🎉", count: 5 }],
      });
    }
  }

  return msgs;
}
