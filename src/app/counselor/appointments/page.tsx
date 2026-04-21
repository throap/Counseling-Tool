import Nav from "@/components/Nav";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import CounselorAppointmentList from "./CounselorAppointmentList";
import { REASON_CATEGORIES, type ReasonCategory, type AppointmentStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

interface SearchParams {
  q?: string;
  date?: string;
  category?: ReasonCategory | "all";
  status?: AppointmentStatus | "all";
}

export default async function CounselorAppointments({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
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
  let query = supabase
    .from("appointments")
    .select(
      "id, appointment_date, start_time, status, reason, reason_category, is_pinned, student:users!appointments_student_id_fkey(id, name, first_name, last_name, email, student_id, school_name, svcte_course)",
    )
    .eq("counselor_id", session.counselorId);

  if (searchParams.date) query = query.eq("appointment_date", searchParams.date);
  if (searchParams.category && searchParams.category !== "all") {
    query = query.eq("reason_category", searchParams.category);
  }
  if (searchParams.status && searchParams.status !== "all") {
    query = query.eq("status", searchParams.status);
  }

  const { data: rows } = await query
    .order("is_pinned", { ascending: false })
    .order("appointment_date", { ascending: false })
    .order("start_time", { ascending: false });

  type Row = {
    id: string;
    appointment_date: string;
    start_time: string;
    status: AppointmentStatus;
    reason: string | null;
    reason_category: ReasonCategory | null;
    is_pinned: boolean;
    student:
      | { id: string; name: string; first_name: string | null; last_name: string | null; email: string; student_id: string | null; school_name: string | null; svcte_course: string | null }
      | { id: string; name: string; first_name: string | null; last_name: string | null; email: string; student_id: string | null; school_name: string | null; svcte_course: string | null }[]
      | null;
  };

  const normalized = ((rows ?? []) as Row[]).map((r) => {
    const s = Array.isArray(r.student) ? r.student[0] : r.student;
    const displayName = s?.first_name && s?.last_name
      ? `${s.first_name} ${s.last_name}`
      : (s?.name ?? "Student");
    return {
      id: r.id,
      date: r.appointment_date,
      startTime: r.start_time,
      status: r.status,
      reason: r.reason,
      reasonCategory: r.reason_category,
      isPinned: r.is_pinned,
      studentName: displayName,
      studentEmail: s?.email ?? "",
      studentId: s?.student_id ?? null,
      schoolName: s?.school_name ?? null,
      svcteCourse: s?.svcte_course ?? null,
    };
  });

  // Text-search (student name) applied server-side here rather than in the query
  // since Supabase needs %ilike% on joined users table.
  const q = searchParams.q?.trim().toLowerCase() ?? "";
  const filtered = q
    ? normalized.filter((r) => r.studentName.toLowerCase().includes(q))
    : normalized;

  return (
    <>
      <Nav role="counselor" />
      <main className="mx-auto max-w-[1200px] px-4 py-8 sm:px-8">
        <h1 className="mb-6 font-serif text-3xl text-ink">All appointments</h1>
        <CounselorAppointmentList
          rows={filtered}
          filters={{
            q: searchParams.q ?? "",
            date: searchParams.date ?? "",
            category: searchParams.category ?? "all",
            status: searchParams.status ?? "all",
          }}
          categories={REASON_CATEGORIES}
        />
      </main>
    </>
  );
}
