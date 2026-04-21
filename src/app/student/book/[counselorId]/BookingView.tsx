"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DAY_NAMES,
  formatDate,
  formatDisplayDate,
  formatDisplayTime,
  generateSlots,
  startOfWeek,
  weekDates,
  type Slot,
} from "@/lib/slots";
import type { AvailabilityRow, AppointmentRow } from "@/lib/types";

interface Props {
  counselorId: string;
  availability: AvailabilityRow[];
  booked: Pick<AppointmentRow, "appointment_date" | "start_time" | "status">[];
}

export default function BookingView({ counselorId, availability, booked }: Props) {
  const router = useRouter();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [selected, setSelected] = useState<Slot | null>(null);
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const slotsByDate = useMemo(() => {
    const all = generateSlots(availability, booked, weekStart);
    const byDate = new Map<string, Slot[]>();
    for (const s of all) {
      const arr = byDate.get(s.date) ?? [];
      arr.push(s);
      byDate.set(s.date, arr);
    }
    return byDate;
  }, [availability, booked, weekStart]);

  const days = weekDates(weekStart);

  function shiftWeek(offset: number) {
    const next = new Date(weekStart);
    next.setDate(weekStart.getDate() + offset * 7);
    setWeekStart(next);
    setSelected(null);
  }

  async function onBook(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setPending(true);
    setError(null);
    setSuccess(null);

    const res = await fetch("/api/appointments/book", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        counselorId,
        appointmentDate: selected.date,
        startTime: selected.startTime,
        reason: reason.trim() || null,
      }),
    });

    const body = await res.json().catch(() => ({}));
    setPending(false);

    if (!res.ok) {
      setError(body.error ?? "Could not book this slot. It may have just been taken.");
      return;
    }

    setSuccess(`Booked ${formatDisplayDate(selected.date)} at ${formatDisplayTime(selected.startTime)}`);
    setSelected(null);
    setReason("");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => shiftWeek(-1)}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
        >
          ← Previous week
        </button>
        <div className="text-sm font-medium text-slate-700">
          Week of {formatDisplayDate(formatDate(weekStart))}
        </div>
        <button
          type="button"
          onClick={() => shiftWeek(1)}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
        >
          Next week →
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-7">
        {days.map((d) => {
          const dateStr = formatDate(d);
          const slots = slotsByDate.get(dateStr) ?? [];
          return (
            <div
              key={dateStr}
              className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
            >
              <div className="mb-2 border-b border-slate-100 pb-2">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  {DAY_NAMES[d.getDay()]}
                </div>
                <div className="text-sm font-semibold text-slate-900">
                  {d.getMonth() + 1}/{d.getDate()}
                </div>
              </div>
              {slots.length === 0 ? (
                <p className="py-2 text-xs text-slate-400">No openings</p>
              ) : (
                <div className="flex flex-col gap-1">
                  {slots.map((s) => {
                    const isSelected =
                      selected?.date === s.date && selected?.startTime === s.startTime;
                    return (
                      <button
                        key={`${s.date}-${s.startTime}`}
                        type="button"
                        onClick={() => setSelected(s)}
                        className={`rounded-md px-2 py-1 text-xs font-medium transition ${
                          isSelected
                            ? "bg-brand text-white"
                            : "bg-brand-50 text-brand-800 hover:bg-brand-100"
                        }`}
                      >
                        {formatDisplayTime(s.startTime)}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selected && (
        <form
          onSubmit={onBook}
          className="rounded-xl border border-brand-200 bg-brand-50 p-5"
        >
          <h3 className="text-lg font-semibold text-brand-800">
            Confirm booking
          </h3>
          <p className="mt-1 text-sm text-brand-800">
            {formatDisplayDate(selected.date)} at {formatDisplayTime(selected.startTime)}
          </p>
          <label className="mt-4 block text-sm font-medium text-slate-700">
            Reason (optional)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100"
            placeholder="What would you like to talk about?"
          />
          {error && (
            <p role="alert" className="mt-3 text-sm text-rose-700">
              {error}
            </p>
          )}
          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {pending ? "Booking…" : "Confirm booking"}
            </button>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {success && (
        <div
          role="status"
          className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800 ring-1 ring-emerald-200"
        >
          {success}
        </div>
      )}
    </div>
  );
}
