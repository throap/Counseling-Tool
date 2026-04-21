import type { Conversation, MessageItem } from "@/components/messaging/MessagingView";

interface RawMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  subject: string;
  body: string;
  read: boolean;
  created_at: string;
  sender: { id: string; name: string } | { id: string; name: string }[] | null;
  recipient: { id: string; name: string } | { id: string; name: string }[] | null;
}

function first<T>(rel: T | T[] | null): T | null {
  return Array.isArray(rel) ? (rel[0] ?? null) : rel;
}

/**
 * Group a flat message list into per-peer conversations for the current user.
 * Each conversation contains all messages exchanged with that peer, newest last.
 */
export function buildConversations(
  rows: RawMessage[],
  currentUserId: string,
): Conversation[] {
  const byPeer = new Map<string, Conversation>();

  for (const r of rows) {
    const sender = first(r.sender);
    const recipient = first(r.recipient);
    const peer = r.sender_id === currentUserId ? recipient : sender;
    if (!peer) continue;

    const convo =
      byPeer.get(peer.id) ??
      ({
        peerId: peer.id,
        peerName: peer.name,
        lastSubject: r.subject,
        lastMessageAt: r.created_at,
        unread: 0,
        messages: [],
      } satisfies Conversation);

    const message: MessageItem = {
      id: r.id,
      senderId: r.sender_id,
      senderName: sender?.name ?? "Unknown",
      recipientId: r.recipient_id,
      subject: r.subject,
      body: r.body,
      read: r.read,
      createdAt: r.created_at,
    };

    convo.messages.push(message);
    if (r.created_at > convo.lastMessageAt) {
      convo.lastMessageAt = r.created_at;
      convo.lastSubject = r.subject;
    }
    if (!r.read && r.recipient_id === currentUserId) {
      convo.unread += 1;
    }

    byPeer.set(peer.id, convo);
  }

  // Sort each conversation's messages oldest -> newest, and conversations by recency.
  for (const convo of byPeer.values()) {
    convo.messages.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
  return Array.from(byPeer.values()).sort((a, b) =>
    b.lastMessageAt.localeCompare(a.lastMessageAt),
  );
}
