"use client";

import { useState, useEffect } from "react";
import type { DraftReply } from "@/temporal/types";
import { IconMessage, IconSend, IconEdit, IconCheck, IconX } from "./icons";

interface Props {
  draft?: DraftReply;
  pending: boolean;
  onApprove: () => void | Promise<void>;
  onEdit: (newContent: string) => void | Promise<void>;
}

export function DraftPanel({ draft, pending, onApprove, onEdit }: Props) {
  const [editing, setEditing] = useState(false);
  const [draftText, setDraftText] = useState("");

  useEffect(() => {
    if (draft) {
      setDraftText(draft.editedContent ?? draft.content);
    }
  }, [draft?.content, draft?.editedContent, draft]);

  if (!draft) return null;

  return (
    <section className="panel fade-in" style={{ marginTop: "1rem" }}>
      <div className="panel-head">
        <h2>
          <IconMessage width={13} height={13} /> AI customer reply
        </h2>
        <span className="meta">
          {draft.status === "pending"
            ? "awaiting CSM approval"
            : draft.status === "approved"
              ? `approved ${draft.approvedAt ? new Date(draft.approvedAt).toLocaleTimeString() : ""}`
              : "edited (unapproved)"}
        </span>
      </div>

      {editing ? (
        <textarea
          className="draft-edit"
          value={draftText}
          onChange={(e) => setDraftText(e.target.value)}
          rows={Math.max(8, draftText.split("\n").length + 1)}
        />
      ) : (
        <pre className="draft-preview">{draft.editedContent ?? draft.content}</pre>
      )}

      {draft.status !== "approved" ? (
        <div className="controls-row" style={{ marginTop: "0.7rem" }}>
          {editing ? (
            <>
              <button
                className="cta"
                onClick={async () => {
                  await onEdit(draftText);
                  setEditing(false);
                }}
                disabled={pending}
              >
                <IconCheck width={13} height={13} /> Save edit
              </button>
              <button
                className="ghost"
                onClick={() => {
                  setDraftText(draft.editedContent ?? draft.content);
                  setEditing(false);
                }}
              >
                <IconX width={13} height={13} /> Cancel
              </button>
            </>
          ) : (
            <>
              <button className="cta" onClick={onApprove} disabled={pending}>
                <IconSend width={13} height={13} /> Approve & send
              </button>
              <button onClick={() => setEditing(true)} disabled={pending}>
                <IconEdit width={13} height={13} /> Edit
              </button>
            </>
          )}
        </div>
      ) : null}
    </section>
  );
}
