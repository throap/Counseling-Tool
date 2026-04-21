import Nav from "@/components/Nav";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import StatusBadge from "@/components/StatusBadge";
import {
  DAY_NAMES,
  formatDate,
  formatDisplayDate,
  formatDisplayTime,
  startOfWeek,
  weekDates,
} from "@/lib/slots";

export const dynamic = "force-dynamic";

export default async function CounselorDashboard() {
  const session = await requireRole("counselor");
  if (!session.counselorId) {
    return (
      <>
        <Nav role="counselor" />
        <main className="mx-auto max-w-4xl px-4 py-8">
          <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">
            Your counselor profile has not been set up yet. Contact your administrator.
          </p>
        </main>
      </>
    );
  }

  const supabase = createClient();
  const weekStart = startOfWeek(new Date());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const { data: appts } = await supabase
    .from("appointments")
    .select(
      "id, appointment_date, start_time, status, reason, student:users!appointments_student_id_fkey(id, name, email, student_id)",
    )
    .eq("counselor_id", session.counselorId)
    .gte("appointment_date", formatDate(weekStart))
    .lte("appointment_date", formatDate(weekEnd))
    .order("appointment_date")
    .order("start_time");

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

  const byDate = new Map<string, Row[]>();
  for (const row of (appts ?? []) as Row[]) {
    const arr = byDate.get(row.appointment_date) ?? [];
    arr.push(row);
    byDate.set(row.appointment_date, arr);
  }

  return (
    <>
      <Nav role="counselor" />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-900">This week</h1>
          <p className="text-slate-600">
            Week of {formatDisplayDate(formatDate(weekStart))}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {weekDates(weekStart).map((d) => {
            const dateStr = formatDate(d);
            const rows = byDate.get(dateStr) ?? [];
            return (
              <div
                key={dateStr}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="mb-3 border-b border-slate-100 pb-2">
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    {DAY_NAMES[d.getDay()]} · {d.getMonth() + 1}/{d.getDate()}
                  </div>
                </div>
                {rows.length === 0 ? (
                  <p className="py-2 text-xs text-slate-400">No appointments</p>
                ) : (
                  <ul className="space-y-2">
                    {rows.map((r) => {
                      const s = Array.isArray(r.student) ? r.student[0] : r.student;
                      return (
                        <li
                          key={r.id}
                          className="rounded-md bg-brand-50 px-3 py-2 text-sm"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-brand-800">
                              {formatDisplayTime(r.start_time)}
                            </span>
                            <StatusBadge status={r.status} />
                          </div>
                          <div className="text-slate-700">{s?.name ?? "Student"}</div>
                          {r.reason && (
                            <div className="mt-1 text-xs italic text-slate-500">
                              “{r.reason}”
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </>
  );
}
