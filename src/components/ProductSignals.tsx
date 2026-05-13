"use client";

import { useCallback, useEffect, useState } from "react";
import type { StoredPlaybook, PlaybookEntry, SignalAudience } from "@/lib/playbook";
import {
  IconBookOpen,
  IconBolt,
  IconUsers,
  IconCheck,
  IconSend,
  IconSpark,
  IconRefresh,
} from "./icons";

interface PostState {
  routingKey: string;
  status: "idle" | "sending" | "sent" | "error";
  error?: string;
}

export function ProductSignals() {
  const [playbook, setPlaybook] = useState<StoredPlaybook | null>(null);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<Record<string, PostState["status"]>>({});
  const [toast, setToast] = useState<{ text: string; err?: boolean } | null>(null);
  const [pending, setPending] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/playbook", { cache: "no-store" });
      const data = (await res.json()) as { playbook: StoredPlaybook | null };
      setPlaybook(data.playbook);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const generate = useCallback(async () => {
    setPending(true);
    try {
      const res = await fetch("/api/playbook/generate", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "playbook gen failed");
      setToast({
        text: `Clustered ${data.result.basedOnEvents} events into ${data.result.entries} patterns`,
      });
      setTimeout(() => setToast(null), 3500);
      await refresh();
    } catch (err) {
      setToast({ text: `Generate failed: ${(err as Error).message}`, err: true });
    } finally {
      setPending(false);
    }
  }, [refresh]);

  const post = useCallback(
    async (entry: PlaybookEntry, routingIdx: number) => {
      const key = `${entry.pattern}::${routingIdx}`;
      setPosts((p) => ({ ...p, [key]: "sending" }));
      try {
        const routing = entry.routings![routingIdx];
        const res = await fetch("/api/signals/post", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pattern: entry.pattern,
            confidence: entry.confidence,
            routing,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "post failed");
        setPosts((p) => ({ ...p, [key]: "sent" }));
        setToast({ text: `Posted to ${routing.channel} (${routing.team})` });
        setTimeout(() => setToast(null), 3500);
      } catch (err) {
        setPosts((p) => ({ ...p, [key]: "error" }));
        setToast({ text: `Post failed: ${(err as Error).message}`, err: true });
      }
    },
    [],
  );

  if (loading) {
    return (
      <section className="panel">
        <div className="skeleton" style={{ height: 200 }} />
      </section>
    );
  }

  if (!playbook) {
    return (
      <section className="panel" style={{ padding: 0 }}>
        <div className="empty" style={{ border: "none", padding: "2.5rem 1.5rem" }}>
          <div style={{ color: "var(--text-2)", marginBottom: "0.75rem" }}>
            No playbook generated yet.
          </div>
          <button className="primary" onClick={generate} disabled={pending}>
            <IconSpark width={13} height={13} /> Generate signals
          </button>
        </div>
      </section>
    );
  }

  const productEntries = playbook.entries.filter((e) =>
    audiencesFor(e).includes("product"),
  );
  const enablementEntries = playbook.entries.filter((e) =>
    audiencesFor(e).includes("enablement"),
  );
  const opsOnly = playbook.entries.filter(
    (e) => audiencesFor(e).every((audience) => audience === "ops"),
  );

  return (
    <>
      <section className="section-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <div className="bigstat">
          <div className="label">Product signals</div>
          <div
            className="num"
            style={{ color: productEntries.length > 0 ? "var(--accent-2)" : undefined }}
          >
            {productEntries.length}
          </div>
          <div className="sub">patterns ready to route to Platform Eng</div>
        </div>
        <div className="bigstat">
          <div className="label">Enablement signals</div>
          <div className="num">{enablementEntries.length}</div>
          <div className="sub">docs / onboarding gaps to fill</div>
        </div>
        <div className="bigstat">
          <div className="label">Internal-only</div>
          <div className="num" style={{ color: "var(--muted)" }}>{opsOnly.length}</div>
          <div className="sub">ops process changes, no external artifact</div>
        </div>
      </section>

      <section className="panel" style={{ padding: 0 }}>
        <div
          className="panel-head"
          style={{ padding: "1rem 1.5rem", borderBottom: "var(--line)", margin: 0 }}
        >
          <h2>
            <IconBolt width={13} height={13} /> Product update ideas
          </h2>
          <button onClick={generate} disabled={pending} className="ghost">
            <IconRefresh width={13} height={13} /> Regenerate
          </button>
        </div>

        <div className="signals-list">
          {productEntries.length === 0 ? (
            <div className="empty" style={{ border: "none", margin: 0 }}>
              No product-tagged patterns yet. Regenerate after a few more escalations
              close, or use the starter patterns in the Ops playbook.
            </div>
          ) : null}
          {productEntries.map((entry, i) => (
            <SignalRow
              key={i}
              entry={entry}
              audience="product"
              posts={posts}
              onPost={(routingIdx) => post(entry, routingIdx)}
            />
          ))}
        </div>
      </section>

      {enablementEntries.length > 0 ? (
        <section className="panel" style={{ padding: 0, marginTop: "1rem" }}>
          <div
            className="panel-head"
            style={{ padding: "1rem 1.5rem", borderBottom: "var(--line)", margin: 0 }}
          >
            <h2>
              <IconBookOpen width={13} height={13} /> Enablement gaps
            </h2>
          </div>
          <div className="signals-list">
            {enablementEntries.map((entry, i) => (
              <SignalRow
                key={i}
                entry={entry}
                audience="enablement"
                posts={posts}
                onPost={(routingIdx) => post(entry, routingIdx)}
              />
            ))}
          </div>
        </section>
      ) : null}

      <div className="why" style={{ margin: "1.5rem" }}>
        <strong>How I&apos;d use this with Product and Data Analytics.</strong> Each
        product-tagged pattern is a candidate for a quarterly review with the SDK
        team: take the top three patterns by frequency × ARR-weight, walk the data,
        propose one ship-ready artifact per quarter. Enablement gets a parallel
        cadence with Developer Relations. The point is the loop — patterns surface
        from real escalations, not from anecdote.
      </div>

      {toast ? (
        <div className={`toast${toast.err ? " err" : " success"}`}>
          {toast.err ? null : <IconCheck width={14} height={14} />}
          {toast.text}
        </div>
      ) : null}
    </>
  );
}

function SignalRow({
  entry,
  audience,
  posts,
  onPost,
}: {
  entry: PlaybookEntry;
  audience?: SignalAudience;
  posts: Record<string, PostState["status"]>;
  onPost: (routingIdx: number) => void;
}) {
  const visibleRoutings = (entry.routings ?? [])
    .map((routing, idx) => ({ routing, idx }))
    .filter(({ routing }) => !audience || routing.audience === audience);
  const hasRoutings = visibleRoutings.length > 0;
  const audiences = audiencesFor(entry);
  const routingSummary =
    audience && visibleRoutings[0]
      ? `${visibleRoutings[0].routing.team} — ${visibleRoutings[0].routing.artifact}`
      : entry.recommendedRouting;

  return (
    <article className="signal-row">
      <header className="signal-row-head">
        <div>
          <h3 className="signal-pattern">{entry.pattern}</h3>
          <div className="signal-meta">
            <span className={`pill ${pillForConfidence(entry.confidence)}`}>
              {entry.confidence} confidence
            </span>
            {audiences.map((a) => (
              <span key={a} className={`pill ai`}>
                <AudienceIcon a={a} /> {a}
              </span>
            ))}
            {!hasRoutings ? (
              <span className="pill">internal only</span>
            ) : null}
          </div>
        </div>
      </header>

      <div className="signal-body">
        <div className="signal-section">
          <div className="signal-section-label">Signals</div>
          <ul className="signal-list">
            {entry.signals.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
        <div className="signal-section">
          <div className="signal-section-label">Recommended routing</div>
          <p className="signal-text">{routingSummary ?? entry.recommendedAction}</p>
        </div>
      </div>

      {hasRoutings ? (
        <div className="signal-routings">
          {visibleRoutings.map(({ routing: r, idx }) => {
            const key = `${entry.pattern}::${idx}`;
            const status = posts[key] ?? "idle";
            return (
              <div className={`signal-routing audience-${r.audience}`} key={idx}>
                <div className="signal-routing-head">
                  <span className="signal-routing-audience">
                    <AudienceIcon a={r.audience} /> {r.audience} signal
                  </span>
                  <span className="signal-routing-team">{r.team}</span>
                </div>
                <div className="signal-routing-artifact">{r.artifact}</div>
                <div className="signal-routing-foot">
                  <span className="mono signal-routing-channel">{r.channel}</span>
                  <button
                    className={status === "sent" ? "ghost" : "primary"}
                    onClick={() => onPost(idx)}
                    disabled={status === "sending" || status === "sent"}
                  >
                    {status === "sent" ? (
                      <>
                        <IconCheck width={12} height={12} /> Posted
                      </>
                    ) : status === "sending" ? (
                      "Posting…"
                    ) : (
                      <>
                        <IconSend width={12} height={12} />{" "}
                        {r.audience === "product"
                          ? "Post to #product-feedback"
                          : `Post to ${r.channel}`}
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </article>
  );
}

function pillForConfidence(c: PlaybookEntry["confidence"]): string {
  return c === "high" ? "normal" : c === "medium" ? "watch" : "";
}

function audiencesFor(entry: PlaybookEntry): SignalAudience[] {
  const fromEntry = entry.signalsFor ?? [];
  const fromRoutings = entry.routings?.map((routing) => routing.audience) ?? [];
  const audiences = new Set<SignalAudience>([...fromEntry, ...fromRoutings]);
  if (audiences.size === 0) audiences.add("ops");
  return (["product", "enablement", "ops"] as SignalAudience[]).filter((audience) =>
    audiences.has(audience),
  );
}

function AudienceIcon({ a }: { a: SignalAudience }) {
  if (a === "product") return <IconBolt width={11} height={11} />;
  if (a === "enablement") return <IconBookOpen width={11} height={11} />;
  return <IconUsers width={11} height={11} />;
}
