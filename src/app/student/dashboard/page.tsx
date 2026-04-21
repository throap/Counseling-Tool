import Nav from "@/components/Nav";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import CounselorList from "./CounselorList";
import { formatDisplayDate, generateSlots, startOfWeek } from "@/lib/slots";

export const dynamic = "force-dynamic";

export default async function StudentDashboard() {
  await requireRole("student");
  const supabase = createClient();

  const { data: counselors } = await supabase
    .from("counselors")
    .select("id, bio, department, photo_url, user:users!counselors_user_id_fkey(id, name, email)")
    .order("department");

  const { data: availability } = await supabase
    .from("availability")
    .select("id, counselor_id, day_of_week, start_time, end_time, slot_duration_minutes");

  const { data: booked } = await supabase
    .from("appointments")
    .select("counselor_id, appointment_date, start_time, status")
    .eq("status", "booked")
    .gte("appointment_date", new Date().toISOString().slice(0, 10));

  const nextByCounselor = new Map<string, string>();
  const thisWeek = startOfWeek(new Date());
  const counselorList = (counselors ?? []) as Array<{
    id: string;
    bio: string | null;
    department: string;
    photo_url: string | null;
    user: { id: string; name: string; email: string } | { id: string; name: string; email: string }[] | null;
  }>;

  for (const c of counselorList) {
    const avail = (availability ?? []).filter((a) => a.counselor_id === c.id);
    const taken = (booked ?? []).filter((b) => b.counselor_id === c.id);
    for (let weekOffset = 0; weekOffset < 4; weekOffset++) {
      const ws = new Date(thisWeek);
      ws.setDate(thisWeek.getDate() + weekOffset * 7);
      const slots = generateSlots(avail, taken, ws);
      if (slots.length > 0) {
        const next = slots[0];
        nextByCounselor.set(c.id, `${formatDisplayDate(next.date)} · ${next.startTime}`);
        break;
      }
    }
  }

  const normalized = counselorList.map((c) => {
    const u = Array.isArray(c.user) ? c.user[0] : c.user;
    return {
      id: c.id,
      name: u?.name ?? "Counselor",
      department: c.department,
      bio: c.bio,
      photoUrl: c.photo_url,
      nextAvailable: nextByCounselor.get(c.id) ?? null,
    };
  });

  return (
    <>
      <Nav role="student" />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8">
          <h1 className="font-serif text-3xl text-ink">Find a counselor</h1>
          <p className="mt-2 text-ink-muted">
            Browse by name or department and book an open slot.
          </p>
        </div>
        <CounselorList counselors={normalized} />
      </main>
    </>
  );
}
