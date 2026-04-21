import Nav from "@/components/Nav";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import BookingFlow from "./BookingFlow";
import type { AvailabilityRow, AppointmentRow } from "@/lib/types";
import type { UnavailableDateRow } from "@/types/unavailable-dates";

export const dynamic = "force-dynamic";

interface SearchParams {
  counselorId?: string;
  date?: string;
  time?: string;
}

export default async function StudentBookPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await requireRole("student");
  const supabase = createClient();

  const { data: counselors } = await supabase
    .from("counselors")
    .select("id, bio, department, photo_url, user:users!counselors_user_id_fkey(id, name, email)")
    .order("department");

  const { data: availability } = await supabase
    .from("availability")
    .select("id, counselor_id, day_of_week, start_time, end_time, slot_duration_minutes");

  const todayStr = new Date().toISOString().slice(0, 10);
  const { data: booked } = await supabase
    .from("appointments")
    .select("counselor_id, appointment_date, start_time, status")
    .eq("status", "booked")
    .gte("appointment_date", todayStr);

  const { data: unavailable } = await supabase
    .from("unavailable_dates")
    .select("id, counselor_id, date, full_day, start_time, end_time, reason, created_at");

  const counselorList = (counselors ?? []) as Array<{
    id: string;
    bio: string | null;
    department: string;
    photo_url: string | null;
    user: { id: string; name: string; email: string } | { id: string; name: string; email: string }[] | null;
  }>;

  const counselorsNormalized = counselorList.map((c) => {
    const u = Array.isArray(c.user) ? c.user[0] : c.user;
    return {
      id: c.id,
      name: u?.name ?? "Counselor",
      department: c.department,
    };
  });

  return (
    <>
      <Nav role="student" />
      <main className="mx-auto max-w-[1000px] px-4 py-8 sm:px-8">
        <h1 className="mb-2 font-serif text-3xl text-ink">Book a session</h1>
        <p className="mb-6 text-ink-muted">Three quick steps — your details, a time, and review.</p>
        <BookingFlow
          defaultStudentName={session.name}
          counselors={counselorsNormalized}
          availability={(availability ?? []) as AvailabilityRow[]}
          booked={(booked ?? []) as Pick<AppointmentRow, "counselor_id" | "appointment_date" | "start_time" | "status">[]}
          unavailable={(unavailable ?? []) as UnavailableDateRow[]}
          prefill={{
            counselorId: searchParams.counselorId,
            date: searchParams.date,
            time: searchParams.time,
          }}
        />
      </main>
    </>
  );
}
