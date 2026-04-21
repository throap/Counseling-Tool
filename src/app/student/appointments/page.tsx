import Nav from "@/components/Nav";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import AppointmentList from "./AppointmentList";

export const dynamic = "force-dynamic";

export default async function StudentAppointments({
  searchParams,
}: {
  searchParams: { cancel?: string };
}) {
  const session = await requireRole("student");
  const supabase = createClient();

  const { data: appointments } = await supabase
    .from("appointments")
    .select(
      "id, appointment_date, start_time, status, reason, counselor:counselors!appointments_counselor_id_fkey(id, department, user:users!counselors_user_id_fkey(id, name))",
    )
    .eq("student_id", session.userId)
    .order("appointment_date", { ascending: false })
    .order("start_time", { ascending: false });

  const today = new Date().toISOString().slice(0, 10);

  type Row = {
    id: string;
    appointment_date: string;
    start_time: string;
    status: "booked" | "cancelled" | "completed";
    reason: string | null;
    counselor:
      | { id: string; department: string; user: { id: string; name: string } | { id: string; name: string }[] | null }
      | { id: string; department: string; user: { id: string; name: string } | { id: string; name: string }[] | null }[]
      | null;
  };

  const rows = ((appointments ?? []) as Row[]).map((a) => {
    const c = Array.isArray(a.counselor) ? a.counselor[0] : a.counselor;
    const cu = c ? (Array.isArray(c.user) ? c.user[0] : c.user) : null;
    return {
      id: a.id,
      date: a.appointment_date,
      startTime: a.start_time,
      status: a.status,
      reason: a.reason,
      counselorName: cu?.name ?? "Counselor",
      counselorDepartment: c?.department ?? "",
    };
  });

  const upcoming = rows.filter((r) => r.date >= today && r.status === "booked");
  const past = rows.filter((r) => !(r.date >= today && r.status === "booked"));

  return (
    <>
      <Nav role="student" />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-semibold text-slate-900">My appointments</h1>
        <AppointmentList upcoming={upcoming} past={past} autoCancelId={searchParams.cancel} />
      </main>
    </>
  );
}
