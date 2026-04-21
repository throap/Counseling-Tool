"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";

export interface MessageItem {
  id: string;
  senderId: string;
  senderName: string;
  recipientId: string;
  subject: string;
  body: string;
  read: boolean;
  createdAt: string;
}

export interface Conversation {
  peerId: string;
  peerName: string;
  lastSubject: string;
  lastMessageAt: string;
  unread: number;
  messages: MessageItem[];
}

export interface RecipientOption {
  id: string;
  name: string;
  detail?: string;
}

interface Props {
  currentUserId: string;
  conversations: Conversation[];
  recipients: RecipientOption[];
  recipientLabel: string;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function MessagingView({
  currentUserId,
  conversations,
  recipients,
  recipientLabel,
}: Props) {
  const router = useRouter();
  const [activePeer, setActivePeer] = useState<string | null>(conversations[0]?.peerId ?? null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [recipientId, setRecipientId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const active = useMemo(
    () => conversations.find((c) => c.peerId === activePeer) ?? null,
    [conversations, activePeer],
  );

  useEffect(() => {
    // When a conversation is opened, mark its unread messages read.
    if (!active || active.unread === 0) return;
    fetch("/api/messages/mark-read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ peerId: active.peerId }),
    }).then(() => router.refresh());
  }, [active, router]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const targetId = active ? active.peerId : recipientId;
    if (!targetId || !subject.trim() || !body.trim()) {
      setError("Pick a recipient and fill in subject and message.");
      return;
    }
    setSending(true);
    const res = await fetch("/api/messages/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipientId: targetId,
        subject: subject.trim(),
        body: body.trim(),
      }),
    });
    setSending(false);
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(payload.error ?? "Could not send message.");
      return;
    }
    setComposeOpen(false);
    setRecipientId("");
    setSubject("");
    setBody("");
    setActivePeer(targetId);
    router.refresh();
  }

  async function reply(e: React.FormEvent) {
    e.preventDefault();
    if (!active) return;
    setError(null);
    if (!body.trim()) {
      setError("Message cannot be empty.");
      return;
    }
    setSending(true);
    const res = await fetch("/api/messages/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipientId: active.peerId,
        subject: `Re: ${active.lastSubject.replace(/^Re:\s*/i, "")}`,
        body: body.trim(),
      }),
    });
    setSending(false);
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(payload.error ?? "Could not send message.");
      return;
    }
    setBody("");
    router.refresh();
  }

  return (
    <div className="grid gap-4 md:grid-cols-[320px_1fr]">
      {/* Conversation list */}
      <div className="space-y-3">
        <Button onClick={() => setComposeOpen(true)} fullWidth>
          Compose
        </Button>
        <Card padding="none" className="overflow-hidden">
          <div className="flex items-center gap-2 border-b border-line bg-surface-muted/60 px-4 py-2 text-xs text-ink-subtle">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span>Messages refresh when you navigate to this page.</span>
            <button
              type="button"
              onClick={() => router.refresh()}
              className="ml-auto text-xs font-medium text-seablue-dark hover:underline"
            >
              Refresh now
            </button>
          </div>
          {conversations.length === 0 ? (
            <p className="p-4 text-sm text-ink-muted">No conversations yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {conversations.map((c) => {
                const isActive = c.peerId === activePeer;
                return (
                  <li key={c.peerId}>
                    <button
                      onClick={() => setActivePeer(c.peerId)}
                      className={`w-full px-4 py-3 text-left transition-colors ${
                        isActive ? "bg-sage-light" : "hover:bg-surface-muted"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-medium text-ink">{c.peerName}</span>
                        {c.unread > 0 && <Badge tone="warning">{c.unread}</Badge>}
                      </div>
                      <div className="mt-0.5 truncate text-xs text-ink-muted">{c.lastSubject}</div>
                      <div className="mt-0.5 text-[11px] text-ink-subtle">
                        {formatTime(c.lastMessageAt)}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      {/* Thread */}
      <Card padding="md" className="flex min-h-[500px] flex-col">
        {!active ? (
          <div className="flex flex-1 items-center justify-center text-sm text-ink-muted">
            Pick a conversation to read messages.
          </div>
        ) : (
          <>
            <div className="mb-4 border-b border-line pb-3">
              <h2 className="font-serif text-xl text-ink">{active.peerName}</h2>
              <p className="text-xs text-ink-subtle">{active.lastSubject}</p>
            </div>

            <ul className="flex-1 space-y-3 overflow-y-auto">
              {active.messages.map((m) => {
                const mine = m.senderId === currentUserId;
                return (
                  <li key={m.id} className={mine ? "text-right" : "text-left"}>
                    <div
                      className={`inline-block max-w-[85%] rounded-md px-4 py-2 text-sm ${
                        mine
                          ? "bg-sage text-white"
                          : "bg-surface-muted text-ink"
                      }`}
                    >
                      <div className="text-xs font-medium opacity-75">{m.senderName}</div>
                      <div className="mt-1 font-medium">{m.subject}</div>
                      <div className="mt-1 whitespace-pre-wrap">{m.body}</div>
                      <div className="mt-1 text-[10px] opacity-75">{formatTime(m.createdAt)}</div>
                    </div>
                  </li>
                );
              })}
            </ul>

            <form onSubmit={reply} className="mt-4 space-y-2 border-t border-line pt-4">
              <Textarea
                rows={3}
                placeholder="Type your reply…"
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
              {error && (
                <p role="alert" className="text-sm text-[color:var(--color-danger)]">
                  {error}
                </p>
              )}
              <div className="flex justify-end">
                <Button type="submit" disabled={sending}>
                  {sending ? "Sending…" : "Send reply"}
                </Button>
              </div>
            </form>
          </>
        )}
      </Card>

      <Modal
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        title="New message"
        footer={
          <>
            <Button variant="ghost" onClick={() => setComposeOpen(false)} disabled={sending}>
              Cancel
            </Button>
            <Button onClick={send} disabled={sending}>
              {sending ? "Sending…" : "Send"}
            </Button>
          </>
        }
      >
        <form onSubmit={send} className="space-y-3">
          <Select
            label={recipientLabel}
            required
            value={recipientId}
            onChange={(e) => setRecipientId(e.target.value)}
          >
            <option value="">Choose…</option>
            {recipients.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
                {r.detail ? ` — ${r.detail}` : ""}
              </option>
            ))}
          </Select>
          <Input
            label="Subject"
            required
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
          <Textarea
            label="Message"
            required
            rows={5}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          {error && (
            <p role="alert" className="text-sm text-[color:var(--color-danger)]">
              {error}
            </p>
          )}
        </form>
      </Modal>
    </div>
  );
}
