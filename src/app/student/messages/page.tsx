import Nav from "@/components/Nav";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import MessagingView from "@/components/messaging/MessagingView";
import { buildConversations } from "@/lib/messages";

export const dynamic = "force-dynamic";

export default async function StudentMessagesPage() {
  const session = await requireRole("student");
  const supabase = createClient();

  const { data: rows } = await supabase
    .from("messages")
    .select(
      "id, sender_id, recipient_id, subject, body, read, created_at, sender:users!messages_sender_id_fkey(id, name), recipient:users!messages_recipient_id_fkey(id, name)",
    )
    .or(`sender_id.eq.${session.userId},recipient_id.eq.${session.userId}`)
    .order("created_at", { ascending: true });

  const conversations = buildConversations(
    (rows ?? []) as Parameters<typeof buildConversations>[0],
    session.userId,
  );

  const { data: counselors } = await supabase
    .from("counselors")
    .select("id, department, user:users!counselors_user_id_fkey(id, name)")
    .order("department");

  const recipients = ((counselors ?? []) as Array<{
    id: string;
    department: string;
    user: { id: string; name: string } | { id: string; name: string }[] | null;
  }>).flatMap((c) => {
    const u = Array.isArray(c.user) ? c.user[0] : c.user;
    if (!u) return [];
    return [{ id: u.id, name: u.name, detail: c.department }];
  });

  return (
    <>
      <Nav role="student" />
      <main className="mx-auto max-w-[1200px] px-4 py-8 sm:px-8">
        <h1 className="mb-6 font-serif text-3xl text-ink">Messages</h1>
        <MessagingView
          currentUserId={session.userId}
          conversations={conversations}
          recipients={recipients}
          recipientLabel="Counselor"
        />
      </main>
    </>
  );
}
