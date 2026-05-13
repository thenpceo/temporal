"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { SupportEscalationState } from "@/temporal/types";

interface Props {
  workflowId: string;
}

interface EmailMessage {
  from: { name: string; email: string };
  to: { name: string; email: string };
  date: string;
  subject: string;
  body: string;
}

export function CustomerStatus({ workflowId }: Props) {
  const [state, setState] = useState<SupportEscalationState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/workflows/${encodeURIComponent(workflowId)}/query`, {
        cache: "no-store",
      });
      if (!res.ok) {
        setError("Case not found");
        return;
      }
      const data = (await res.json()) as { state: SupportEscalationState | null };
      setState(data.state);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [workflowId]);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 2500);
    return () => clearInterval(t);
  }, [refresh]);

  if (error) return <div className="empty" style={{ margin: "1.5rem" }}>{error}</div>;
  if (!state) return <div className="empty" style={{ margin: "1.5rem" }}>Loading…</div>;

  const owner = (state.assignedOwner ?? state.classification?.recommendedOwner ?? "Support Ops")
    .split(",")[0];
  const replyBody = state.draftReply?.editedContent ?? state.draftReply?.content;

  const thread: EmailMessage[] = [];

  // Inbound — customer's original ticket
  if (state.ticket) {
    thread.push({
      from: { name: state.ticket.customerName, email: state.ticket.requesterEmail },
      to: { name: "Temporal Support", email: "support@temporal.io" },
      date: new Date(state.ticket.createdAt).toLocaleString(),
      subject: state.ticket.subject,
      body: state.ticket.body,
    });
  }

  // Auto-ack
  if (state.salesforceCaseId) {
    thread.push({
      from: { name: "Temporal Support", email: "support@temporal.io" },
      to: { name: state.ticket?.customerName ?? "", email: state.ticket?.requesterEmail ?? "" },
      date: "—",
      subject: `Re: ${state.ticket?.subject ?? ""}`,
      body:
        `Thanks for reaching out. We've opened case ${state.salesforceCaseId} and ` +
        `${owner} has been paged. You'll get a substantive update within 30 minutes.`,
    });
  }

  // CSM reply (only if approved)
  if (replyBody && state.draftReply?.status === "approved") {
    thread.push({
      from: { name: owner, email: "jordan.lee@temporal.io" },
      to: { name: state.ticket?.customerName ?? "", email: state.ticket?.requesterEmail ?? "" },
      date: state.draftReply.approvedAt
        ? new Date(state.draftReply.approvedAt).toLocaleString()
        : "—",
      subject: `Re: ${state.ticket?.subject ?? ""}`,
      body: replyBody,
    });
  }

  // Resolution note
  if (state.resolved) {
    thread.push({
      from: { name: owner, email: "jordan.lee@temporal.io" },
      to: { name: state.ticket?.customerName ?? "", email: state.ticket?.requesterEmail ?? "" },
      date: "—",
      subject: `Re: ${state.ticket?.subject ?? ""}`,
      body:
        `Quick close-out: this case is resolved on our side. ` +
        `If anything regresses, reply on this thread and we'll re-open it immediately.`,
    });
  }

  return (
    <>
      <section className="cust-banner">
        <div className="eyebrow">Customer inbox · {state.ticket?.requesterEmail ?? "—"}</div>
        <h1>What the customer actually sees</h1>
        <div className="meta">
          Email thread, rendered live from the workflow state. No client portal, no login,
          no &ldquo;ticket #42&rdquo; jargon — just the support thread that arrived in their inbox.
        </div>
      </section>

      <div className="email-thread">
        {thread.map((m, i) => {
          const isInbound = m.from.email === state.ticket?.requesterEmail;
          return (
            <article key={i} className={`email-msg${isInbound ? " inbound" : ""}`}>
              <header className="email-head">
                <div>
                  <span className="email-from-name">{m.from.name}</span>
                  <span className="email-from-addr">&lt;{m.from.email}&gt;</span>
                </div>
                <div className="email-date">{m.date}</div>
              </header>
              <div className="email-to">
                <span className="email-label">To</span>
                {m.to.name} &lt;{m.to.email}&gt;
              </div>
              <div className="email-subj">
                <span className="email-label">Subject</span>
                {m.subject}
              </div>
              <div className="email-body">{m.body}</div>
              {!isInbound ? (
                <footer className="email-sig">
                  — sent on behalf of {owner} via the Temporal support workflow
                </footer>
              ) : null}
            </article>
          );
        })}

        {!state.draftReply || state.draftReply.status !== "approved" ? (
          <div className="email-msg pending">
            <header className="email-head">
              <div>
                <span className="email-from-name">{owner}</span>
                <span className="email-from-addr">&lt;jordan.lee@temporal.io&gt;</span>
              </div>
              <div className="email-date">Drafting…</div>
            </header>
            <div className="email-body" style={{ color: "var(--muted)", fontStyle: "italic" }}>
              {state.draftReply
                ? "AI-drafted, awaiting CSM approval before sending. The customer doesn't see this yet."
                : "Workflow has not produced a customer-facing draft yet."}
            </div>
          </div>
        ) : null}
      </div>

      <div className="why" style={{ margin: "1.5rem" }}>
        The customer&apos;s reality is an inbox, not a portal. Each email above is generated from
        the same Temporal workflow state your support team is watching. When the CSM approves
        the draft, this thread updates.{" "}
        <Link href={`/cases/${encodeURIComponent(workflowId)}`}>Internal view</Link> ·{" "}
        <Link href={`/pylon/${encodeURIComponent(workflowId)}`}>Pylon view</Link>
      </div>
    </>
  );
}
