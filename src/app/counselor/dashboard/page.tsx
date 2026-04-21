import Link from "next/link";
import Nav from "@/components/Nav";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  FULL_DAY_NAMES,
  formatDate,
  formatDisplayDate,
  formatDisplayTime,
  startOfWeek,
  weekDates,
} from "@/lib/slots";
import AppointmentActions from "./AppointmentActions";
import type { AppointmentStatus, ReasonCategory, AvailabilityRow } from "@/lib/types";
import type { UnavailableDateRow } from "@/types/unavailable-dates";

export const dynamic = "force-dynamic";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function todayLongFormat(): string {
  return new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function firstMonthDay(): string {
  const d = new Date();
  return formatDate(new Date(d.getFullYear(), d.getMonth(), 1));
}

function lastMonthDay(): string {
  const d = new Date();
  return formatDate(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}

function minutesToHHMM(m: number): string {
  const h = Math.floor(m / 60).toString().padStart(2, "0");
  const mm = (m % 60).toString().padStart(2, "0");
  return `${h}:${mm}`;
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** All 30-min-ish slots in today's availability, minus full-day / window-overlap time off. */
function scheduleSlots(
  availability: AvailabilityRow[],
  unavailable: UnavailableDateRow[],
  today: Date,
): string[] {
  const dow = today.getDay();
  const dateStr = formatDate(today);
  const slots: string[] = [];
  const todaysBlocks = availability.filter((a) => a.day_of_week === dow);
  if (todaysBlocks.length === 0) return [];

  const offs = unavailable.filter((u) => u.date === dateStr);
  if (offs.some((u) => u.full_day)) return [];

  for (const block of todaysBlocks) {
    const start = toMinutes(block.start_time.slice(0, 5));
    const end = toMinutes(block.end_time.slice(0, 5));
    const dur = block.slot_duration_minutes || 30;
    for (let t = start; t + dur <= end; t += dur) {
      const s = t;
      const e = t + dur;
      const blocked = offs.some((u) => {
        if (u.full_day || !u.start_time || !u.end_time) return false;
        const bs = toMinutes(u.start_time.slice(0, 5));
        const be = toMinutes(u.end_time.slice(0, 5));
        return s < be && e > bs;
      });
      if (!blocked) slots.push(minutesToHHMM(s));
    }
  }
  return Array.from(new Set(slots)).sort();
}

export default async function CounselorDashboard() {
  const session = await requireRole("counselor");
  if (!session.counselorId) {
    return (
      <>
        <Nav role="counselor" />
        <main className="mx-auto max-w-[1200px] px-4 py-8 sm:px-8">
          <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">
            Your counselor profile has not been set up yet. Contact your administrator.
          </p>
        </main>
      </>
    );
  }

  const supabase = createClient();
  const today = formatDate(new Date());
  const weekStart = startOfWeek(new Date());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const monthStart = firstMonthDay();
  const monthEnd = lastMonthDay();

  // Availability + time-off for building today's schedule grid
  const { data: availability } = await supabase
    .from("availability")
    .select("id, counselor_id, day_of_week, start_time, end_time, slot_duration_minutes")
    .eq("counselor_id", session.counselorId);

  const { data: unavailable } = await supabase
    .from("unavailable_dates")
    .select("id, counselor_id, date, full_day, start_time, end_time, reason, created_at")
    .eq("counselor_id", session.counselorId)
    .eq("date", today);

  // Pinned — include reason text and additional_notes for the amber cards
  const { data: pinnedRows } = await supabase
    .from("appointments")
    .select(
      "id, appointment_date, start_time, reason, reason_category, additional_notes, is_pinned, student:users!appointments_student_id_fkey(name, first_name, last_name)",
    )
    .eq("counselor_id", session.counselorId)
    .eq("is_pinned", true)
    .order("appointment_date")
    .order("start_time");

  // Today's appointments (all statuses so we can show cancelled slots)
  const { data: todayRows } = await supabase
    .from("appointments")
    .select(
      "id, start_time, reason, reason_category, additional_notes, status, is_pinned, student:users!appointments_student_id_fkey(name, email, first_name, last_name)",
    )
    .eq("counselor_id", session.counselorId)
    .eq("appointment_date", today)
    .order("start_time");

  // This-week summary
  const { data: weekRows } = await supabase
    .from("appointments")
    .select("appointment_date, status")
    .eq("counselor_id", session.counselorId)
    .gte("appointment_date", formatDate(weekStart))
    .lte("appointment_date", formatDate(weekEnd))
    .neq("status", "cancelled");

  // Unread messages (last 3)
  const { data: unreadMessages } = await supabase
    .from("messages")
    .select(
      "id, subject, created_at, sender:users!messages_sender_id_fkey(name)",
    )
    .eq("recipient_id", session.userId)
    .eq("read", false)
    .order("created_at", { ascending: false })
    .limit(3);

  // Quick stats
  const { count: monthSessions } = await supabase
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("counselor_id", session.counselorId)
    .gte("appointment_date", monthStart)
    .lte("appointment_date", monthEnd)
    .in("status", ["booked", "completed"]);

  const { count: monthCancellations } = await supabase
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("counselor_id", session.counselorId)
    .gte("appointment_date", monthStart)
    .lte("appointment_date", monthEnd)
    .eq("status", "cancelled");

  const { count: upcomingCount } = await supabase
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("counselor_id", session.counselorId)
    .gte("appointment_date", today)
    .eq("status", "booked");

  const { count: pinnedCount } = await supabase
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("counselor_id", session.counselorId)
    .eq("is_pinned", true);

  // --- Normalise ---
  type StudentRel =
    | { name: string; email?: string; first_name: string | null; last_name: string | null }
    | { name: string; email?: string; first_name: string | null; last_name: string | null }[]
    | null;

  function name(rel: StudentRel): string {
    const s = Array.isArray(rel) ? rel[0] : rel;
    if (!s) return "Student";
    if (s.first_name && s.last_name) return `${s.first_name} ${s.last_name}`;
    return s.name;
  }

  function email(rel: StudentRel): string {
    const s = Array.isArray(rel) ? rel[0] : rel;
    return s?.email ?? "";
  }

  const pinned = ((pinnedRows ?? []) as Array<{
    id: string;
    appointment_date: string;
    start_time: string;
    reason: string | null;
    reason_category: ReasonCategory | null;
    additional_notes: string | null;
    is_pinned: boolean;
    student: StudentRel;
  }>).map((r) => {
    const start = new Date(`${r.appointment_date}T${r.start_time}`);
    const hoursUntil = (start.getTime() - Date.now()) / (1000 * 60 * 60);
    return {
      id: r.id,
      date: r.appointment_date,
      startTime: r.start_time,
      category: r.reason_category,
      reason: r.reason,
      additionalNotes: r.additional_notes,
      studentName: name(r.student),
      hoursUntil,
    };
  });

  type TodayAppt = {
    id: string;
    start_time: string;
    reason: string | null;
    reason_category: ReasonCategory | null;
    additional_notes: string | null;
    status: AppointmentStatus;
    is_pinned: boolean;
    student: StudentRel;
  };
  const todayAppts = (todayRows ?? []) as TodayAppt[];

  // Build the full "today schedule" — expected slots from availability, merged
  // with any appointment that falls at that time. We also include any stray
  // appointments whose start_time isn't in the availability grid (e.g. the
  // counselor trimmed their hours after the booking).
  const slotList = scheduleSlots(
    (availability ?? []) as AvailabilityRow[],
    (unavailable ?? []) as UnavailableDateRow[],
    new Date(),
  );
  const allTimes = new Set<string>(slotList);
  for (const a of todayAppts) {
    allTimes.add(a.start_time.slice(0, 5));
  }
  const apptByTime = new Map<string, TodayAppt>();
  for (const a of todayAppts) {
    apptByTime.set(a.start_time.slice(0, 5), a);
  }
  const scheduleRows = Array.from(allTimes)
    .sort()
    .map((t) => {
      const appt = apptByTime.get(t) ?? null;
      return { time: t, appt };
    });

  // -- Week summary --
  const thisWeekByDate = new Map<string, number>();
  for (const r of (weekRows ?? []) as Array<{ appointment_date: string }>) {
    thisWeekByDate.set(r.appointment_date, (thisWeekByDate.get(r.appointment_date) ?? 0) + 1);
  }
  const weekSummary = weekDates(weekStart)
    .map((d) => ({
      date: formatDate(d),
      dayName: FULL_DAY_NAMES[d.getDay()],
      count: thisWeekByDate.get(formatDate(d)) ?? 0,
    }))
    .filter((r) => r.count > 0);

  const messages = ((unreadMessages ?? []) as Array<{
    id: string;
    subject: string;
    sender: { name: string } | { name: string }[] | null;
  }>).map((m) => {
    const s = Array.isArray(m.sender) ? m.sender[0] : m.sender;
    return { id: m.id, subject: m.subject, senderName: s?.name ?? "Unknown" };
  });

  const firstName = session.name.split(" ")[0] || session.name;

  const stats = [
    { label: "Sessions this month", value: monthSessions ?? 0, accent: "accent-sage" },
    { label: "Upcoming appointments", value: upcomingCount ?? 0, accent: "accent-blue" },
    { label: "Pinned appointments", value: pinnedCount ?? 0, accent: "accent-amber" },
    { label: "Cancellations this month", value: monthCancellations ?? 0, accent: "accent-gray" },
  ];

  return (
    <>
      <Nav role="counselor" />
      <main className="mx-auto max-w-[1200px] px-4 py-8 sm:px-8">
        {/* Hero */}
        <header className="mb-8">
          <h1 className="font-serif text-3xl text-ink">
            {greeting()}, {firstName}
          </h1>
          <p className="mt-1 text-ink-muted">{todayLongFormat()}</p>
        </header>

        {/* Pinned */}
        {pinned.length > 0 && (
          <section className="mb-8">
            <div className="mb-3 flex items-center gap-2">
              <h2 className="font-serif text-xl text-ink">Pinned</h2>
              <Badge tone="warning">📌 {pinned.length}</Badge>
            </div>
            <div className="pinned-grid">
              {pinned.map((p) => {
                const dateLabel = new Date(`${p.date}T00:00:00`).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                });
                return (
                  <div key={p.id} className="pinned-card">
                    <div className="flex flex-wrap items-center gap-2">
                      {p.category && (
                        <span className="pinned-category-badge">{p.category}</span>
                      )}
                      <span className="pinned-datetime">
                        {dateLabel} · {formatDisplayTime(p.startTime)}
                      </span>
                    </div>
                    <div className="pinned-name">{p.studentName}</div>
                    {p.reason && <div className="pinned-reason">{p.reason.slice(0, 80)}</div>}
                    {p.additionalNotes && (
                      <div className="pinned-notes">{p.additionalNotes.slice(0, 100)}</div>
                    )}
                    <div className="mt-3">
                      <AppointmentActions
                        appointmentId={p.id}
                        isPinned={true}
                        alwaysShowUnpin
                        appointmentLabel={`${p.studentName} — ${formatDisplayDate(p.date)} at ${formatDisplayTime(p.startTime)}`}
                        hoursUntil={p.hoursUntil}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Today's schedule */}
          <section>
            <h2 className="mb-3 font-serif text-xl text-ink">Today&rsquo;s appointments</h2>
            <Card padding="none" className="overflow-hidden">
              {scheduleRows.length === 0 ? (
                <p className="p-4 text-center text-sm text-ink-muted">
                  No availability or appointments today.
                </p>
              ) : (
                <div>
                  {scheduleRows.map(({ time, appt }) => {
                    if (!appt) {
                      return (
                        <div key={time} className="schedule-row">
                          <div className="schedule-time">{formatDisplayTime(time)}</div>
                          <span className="schedule-badge open">Available</span>
                        </div>
                      );
                    }
                    const studentName = name(appt.student);
                    const studentEmail = email(appt.student);
                    const start = new Date(`${today}T${appt.start_time}`);
                    const hoursUntil = (start.getTime() - Date.now()) / (1000 * 60 * 60);
                    return (
                      <div
                        key={appt.id}
                        className={`schedule-row ${appt.is_pinned ? "is-pinned" : ""}`}
                      >
                        <div className="schedule-time">{formatDisplayTime(time)}</div>
                        <span className={`schedule-badge ${appt.status}`}>
                          {appt.status}
                        </span>
                        <div className="schedule-info">
                          <div className="schedule-name">{studentName}</div>
                          {studentEmail && (
                            <div className="schedule-meta">{studentEmail}</div>
                          )}
                          {appt.reason_category && (
                            <div className="schedule-reason">{appt.reason_category}</div>
                          )}
                          {appt.additional_notes && (
                            <div className="schedule-notes">
                              {appt.additional_notes.slice(0, 80)}
                            </div>
                          )}
                        </div>
                        {appt.status === "booked" && (
                          <AppointmentActions
                            appointmentId={appt.id}
                            isPinned={appt.is_pinned}
                            appointmentLabel={`${studentName} — today at ${formatDisplayTime(time)}`}
                            hoursUntil={hoursUntil}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </section>

          {/* This week */}
          <section>
            <h2 className="mb-3 font-serif text-xl text-ink">This week</h2>
            <Card padding="sm">
              {weekSummary.length === 0 ? (
                <p className="py-2 text-center text-sm text-ink-muted">
                  No appointments scheduled this week.
                </p>
              ) : (
                <ul className="divide-y divide-line">
                  {weekSummary.map((d) => (
                    <li key={d.date} className="flex items-center justify-between py-2 text-sm">
                      <span className="text-ink">{d.dayName}</span>
                      <span className="rounded-full bg-sage-light px-2.5 py-0.5 text-xs font-medium text-sage-dark">
                        {d.count} {d.count === 1 ? "appointment" : "appointments"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </section>
        </div>

        {/* Unread messages */}
        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-serif text-xl text-ink">Unread messages</h2>
            <Link href="/counselor/messages" className="text-sm text-sage-dark hover:underline">
              View all →
            </Link>
          </div>
          <Card padding="sm">
            {messages.length === 0 ? (
              <p className="py-2 text-center text-sm text-ink-muted">No unread messages.</p>
            ) : (
              <ul className="divide-y divide-line">
                {messages.map((m) => (
                  <li key={m.id}>
                    <Link
                      href="/counselor/messages"
                      className="block py-3 transition-colors hover:bg-surface-muted/40"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium text-ink">{m.senderName}</span>
                        <Badge tone="warning">Unread</Badge>
                      </div>
                      <div className="mt-0.5 truncate text-sm text-ink-muted">{m.subject}</div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>

        {/* Quick stats */}
        <section className="mt-8">
          <h2 className="mb-3 font-serif text-xl text-ink">Quick stats</h2>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className={`stat-card ${s.accent}`}>
                <div className="stat-value">{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
