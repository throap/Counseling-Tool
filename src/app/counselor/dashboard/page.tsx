import Link from "next/link";
import Nav from "@/components/Nav";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  FULL_DAY_NAMES,
  formatDate,
  formatDisplayTime,
  startOfWeek,
  weekDates,
} from "@/lib/slots";
import UnpinButton from "./UnpinButton";
import type { AppointmentStatus, ReasonCategory } from "@/lib/types";

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

  // Pinned
  const { data: pinnedRows } = await supabase
    .from("appointments")
    .select(
      "id, appointment_date, start_time, reason_category, student:users!appointments_student_id_fkey(name, first_name, last_name)",
    )
    .eq("counselor_id", session.counselorId)
    .eq("is_pinned", true)
    .order("appointment_date")
    .order("start_time");

  // Today's appointments
  const { data: todayRows } = await supabase
    .from("appointments")
    .select(
      "id, start_time, reason, status, student:users!appointments_student_id_fkey(name, first_name, last_name)",
    )
    .eq("counselor_id", session.counselorId)
    .eq("appointment_date", today)
    .neq("status", "cancelled")
    .order("start_time");

  // This week aggregate
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
      "id, subject, body, created_at, sender:users!messages_sender_id_fkey(name)",
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

  // -- Normalize --
  type StudentRel =
    | { name: string; first_name: string | null; last_name: string | null }
    | { name: string; first_name: string | null; last_name: string | null }[]
    | null;

  function name(rel: StudentRel): string {
    const s = Array.isArray(rel) ? rel[0] : rel;
    if (!s) return "Student";
    if (s.first_name && s.last_name) return `${s.first_name} ${s.last_name}`;
    return s.name;
  }

  const pinned = ((pinnedRows ?? []) as Array<{
    id: string;
    appointment_date: string;
    start_time: string;
    reason_category: ReasonCategory | null;
    student: StudentRel;
  }>).map((r) => ({
    id: r.id,
    date: r.appointment_date,
    startTime: r.start_time,
    category: r.reason_category,
    studentName: name(r.student),
  }));

  const todays = ((todayRows ?? []) as Array<{
    id: string;
    start_time: string;
    reason: string | null;
    status: AppointmentStatus;
    student: StudentRel;
  }>).map((r) => ({
    id: r.id,
    startTime: r.start_time,
    reason: r.reason,
    studentName: name(r.student),
  }));

  const thisWeekByDate = new Map<string, number>();
  for (const r of (weekRows ?? []) as Array<{ appointment_date: string }>) {
    thisWeekByDate.set(r.appointment_date, (thisWeekByDate.get(r.appointment_date) ?? 0) + 1);
  }
  const weekSummary = weekDates(weekStart)
    .map((d) => {
      const key = formatDate(d);
      return { date: key, dayName: FULL_DAY_NAMES[d.getDay()], count: thisWeekByDate.get(key) ?? 0 };
    })
    .filter((r) => r.count > 0);

  const messages = ((unreadMessages ?? []) as Array<{
    id: string;
    subject: string;
    body: string;
    created_at: string;
    sender: { name: string } | { name: string }[] | null;
  }>).map((m) => {
    const s = Array.isArray(m.sender) ? m.sender[0] : m.sender;
    return {
      id: m.id,
      subject: m.subject,
      senderName: s?.name ?? "Unknown",
    };
  });

  const firstName = session.name.split(" ")[0] || session.name;

  const stats = [
    { label: "Sessions this month", value: monthSessions ?? 0 },
    { label: "Cancellations this month", value: monthCancellations ?? 0 },
    { label: "Upcoming appointments", value: upcomingCount ?? 0 },
    { label: "Pinned appointments", value: pinnedCount ?? 0 },
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
              <Badge tone="sage">📌 {pinned.length}</Badge>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {pinned.map((p) => (
                <Card key={p.id} padding="md">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-medium text-ink">{p.studentName}</div>
                      <div className="mt-1 text-sm text-ink-muted">
                        {new Date(`${p.date}T00:00:00`).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}{" "}
                        · {formatDisplayTime(p.startTime)}
                      </div>
                      {p.category && (
                        <div className="mt-2">
                          <Badge tone="blue">{p.category}</Badge>
                        </div>
                      )}
                    </div>
                    <UnpinButton appointmentId={p.id} />
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Today */}
          <section>
            <h2 className="mb-3 font-serif text-xl text-ink">Today&rsquo;s appointments</h2>
            <Card padding="sm">
              {todays.length === 0 ? (
                <p className="py-2 text-center text-sm text-ink-muted">No appointments today.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {todays.map((t) => (
                    <li key={t.id} className="flex items-start justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <div className="font-medium text-ink">{t.studentName}</div>
                        {t.reason && (
                          <div className="mt-0.5 truncate text-sm text-ink-muted">
                            {t.reason.slice(0, 60)}
                            {t.reason.length > 60 ? "…" : ""}
                          </div>
                        )}
                      </div>
                      <div className="shrink-0 text-sm font-medium text-sage-dark">
                        {formatDisplayTime(t.startTime)}
                      </div>
                    </li>
                  ))}
                </ul>
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
              <Card key={s.label} padding="md" className="text-center">
                <div className="text-3xl font-medium text-sage-dark">{s.value}</div>
                <div className="mt-1 text-xs text-ink-muted">{s.label}</div>
              </Card>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
