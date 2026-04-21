import Nav from "@/components/Nav";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import AvailabilityEditor from "./AvailabilityEditor";

export const dynamic = "force-dynamic";

export default async function AvailabilityPage() {
  const session = await requireRole("counselor");
  if (!session.counselorId) {
    return (
      <>
        <Nav role="counselor" />
        <main className="mx-auto max-w-4xl px-4 py-8">
          <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">
            Counselor profile not found. Contact your administrator.
          </p>
        </main>
      </>
    );
  }

  const supabase = createClient();
  const { data: availability } = await supabase
    .from("availability")
    .select("id, counselor_id, day_of_week, start_time, end_time, slot_duration_minutes")
    .eq("counselor_id", session.counselorId)
    .order("day_of_week")
    .order("start_time");

  return (
    <>
      <Nav role="counselor" />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="mb-2 text-2xl font-semibold text-slate-900">Weekly availability</h1>
        <p className="mb-6 text-slate-600">
          Add recurring blocks of time. Students will see 30-minute slots generated from each block.
        </p>
        <AvailabilityEditor
          counselorId={session.counselorId}
          initial={(availability ?? []).map((a) => ({
            id: a.id,
            dayOfWeek: a.day_of_week,
            startTime: a.start_time.slice(0, 5),
            endTime: a.end_time.slice(0, 5),
            slotDuration: a.slot_duration_minutes,
          }))}
        />
      </main>
    </>
  );
}
