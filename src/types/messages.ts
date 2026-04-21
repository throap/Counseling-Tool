export interface MessageRow {
  id: string;
  sender_id: string;
  recipient_id: string;
  subject: string;
  body: string;
  read: boolean;
  parent_message_id: string | null;
  created_at: string;
}

export interface MessageWithPeople extends MessageRow {
  sender: { id: string; name: string; email: string };
  recipient: { id: string; name: string; email: string };
}

export interface ThreadSummary {
  threadId: string;
  subject: string;
  peerId: string;
  peerName: string;
  lastMessageAt: string;
  lastMessagePreview: string;
  unreadCount: number;
  lastSenderIsMe: boolean;
}
