import Nav from "@/components/Nav";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import CounselorAppointmentList from "./CounselorAppointmentList";

export const dynamic = "force-dynamic";

export default async function CounselorAppointments() {
  const session = await requireRole("counselor");
  if (!session.counselorId) {
    return (
      <>
        <Nav role="counselor" />
        <main className="mx-auto max-w-4xl px-4 py-8">
          <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">
            Counselor profile not found.
          </p>
        </main>
      </>
    );
  }

  const supabase = createClient();
  const { data: rows } = await supabase
    .from("appointments")
    .select(
      "id, appointment_date, start_time, status, reason, student:users!appointments_student_id_fkey(id, name, email, student_id)",
    )
    .eq("counselor_id", session.counselorId)
    .order("appointment_date", { ascending: false })
    .order("start_time", { ascending: false });

  type Row = {
    id: string;
    appointment_date: string;
    start_time: string;
    status: "booked" | "cancelled" | "completed";
    reason: string | null;
    student:
      | { id: string; name: string; email: string; student_id: string | null }
      | { id: string; name: string; email: string; student_id: string | null }[]
      | null;
  };

  const normalized = ((rows ?? []) as Row[]).map((r) => {
    const s = Array.isArray(r.student) ? r.student[0] : r.student;
    return {
      id: r.id,
      date: r.appointment_date,
      startTime: r.start_time,
      status: r.status,
      reason: r.reason,
      studentName: s?.name ?? "Student",
      studentEmail: s?.email ?? "",
      studentId: s?.student_id ?? null,
    };
  });

  return (
    <>
      <Nav role="counselor" />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-semibold text-slate-900">All appointments</h1>
        <CounselorAppointmentList rows={normalized} />
      </main>
    </>
  );
}
