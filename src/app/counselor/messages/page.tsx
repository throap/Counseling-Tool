import Nav from "@/components/Nav";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import MessagingView from "@/components/messaging/MessagingView";
import { buildConversations } from "@/lib/messages";

export const dynamic = "force-dynamic";

export default async function CounselorMessagesPage() {
  const session = await requireRole("counselor");
  if (!session.counselorId) {
    return (
      <>
        <Nav role="counselor" />
        <main className="mx-auto max-w-[1200px] px-4 py-8 sm:px-8">
          <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">
            Counselor profile not found.
          </p>
        </main>
      </>
    );
  }

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

  // Recipients for counselor compose: only students with a current or past
  // appointment with this counselor. RLS on users grants counselors read access
  // via the users_counselor_read_students policy.
  const { data: pastStudents } = await supabase
    .from("appointments")
    .select("student:users!appointments_student_id_fkey(id, name, school_name)")
    .eq("counselor_id", session.counselorId);

  const seen = new Set<string>();
  const recipients: { id: string; name: string; detail?: string }[] = [];
  for (const row of (pastStudents ?? []) as Array<{
    student:
      | { id: string; name: string; school_name: string | null }
      | { id: string; name: string; school_name: string | null }[]
      | null;
  }>) {
    const s = Array.isArray(row.student) ? row.student[0] : row.student;
    if (!s || seen.has(s.id)) continue;
    seen.add(s.id);
    recipients.push({ id: s.id, name: s.name, detail: s.school_name ?? undefined });
  }
  recipients.sort((a, b) => a.name.localeCompare(b.name));

  return (
    <>
      <Nav role="counselor" />
      <main className="mx-auto max-w-[1200px] px-4 py-8 sm:px-8">
        <h1 className="mb-6 font-serif text-3xl text-ink">Messages</h1>
        <MessagingView
          currentUserId={session.userId}
          conversations={conversations}
          recipients={recipients}
          recipientLabel="Student"
        />
      </main>
    </>
  );
}
