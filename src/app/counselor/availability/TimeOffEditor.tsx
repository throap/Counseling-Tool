"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatDisplayDate, formatDisplayTime } from "@/lib/slots";
import { Card } from "@/components/ui/Card";
import { Input, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import type { UnavailableDateRow } from "@/types/unavailable-dates";

interface Props {
  counselorId: string;
  initial: UnavailableDateRow[];
}

// Fixed 30-min grid from 8am to 5pm (18 slots, rendered as 6 rows x 3 cols).
const GRID_SLOTS: string[] = (() => {
  const out: string[] = [];
  for (let m = 8 * 60; m < 17 * 60; m += 30) {
    const h = Math.floor(m / 60).toString().padStart(2, "0");
    const mm = (m % 60).toString().padStart(2, "0");
    out.push(`${h}:${mm}`);
  }
  return out;
})();

const MORNING_SLOTS = GRID_SLOTS.filter((s) => s < "12:00");
const AFTERNOON_SLOTS = GRID_SLOTS.filter((s) => s >= "12:00");

function slotEnd(start: string): string {
  const [h, m] = start.split(":").map(Number);
  const total = h * 60 + m + 30;
  return `${Math.floor(total / 60).toString().padStart(2, "0")}:${(total % 60).toString().padStart(2, "0")}`;
}

/**
 * Merge an unsorted list of 30-min slot starts into contiguous windows.
 * Each window is stored as a single unavailable_dates row to minimise writes
 * and to match the table's CHECK constraint (one start/end pair per row).
 */
function compress(selected: string[]): Array<{ start: string; end: string }> {
  if (selected.length === 0) return [];
  const sorted = [...selected].sort();
  const out: Array<{ start: string; end: string }> = [];
  let curStart = sorted[0];
  let curEnd = slotEnd(sorted[0]);
  for (let i = 1; i < sorted.length; i++) {
    const s = sorted[i];
    if (s === curEnd) {
      curEnd = slotEnd(s);
    } else {
      out.push({ start: curStart, end: curEnd });
      curStart = s;
      curEnd = slotEnd(s);
    }
  }
  out.push({ start: curStart, end: curEnd });
  return out;
}

export default function TimeOffEditor({ counselorId, initial }: Props) {
  const router = useRouter();
  const [rows, setRows] = useState<UnavailableDateRow[]>(initial);
  const [date, setDate] = useState("");
  const [fullDay, setFullDay] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [reason, setReason] = useState("");
  const [bookedSet, setBookedSet] = useState<Set<string>>(new Set());
  const [conflictCount, setConflictCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!date) {
      setConflictCount(null);
      setBookedSet(new Set());
      return;
    }
    const supabase = createClient();
    supabase
      .from("appointments")
      .select("start_time")
      .eq("counselor_id", counselorId)
      .eq("appointment_date", date)
      .eq("status", "booked")
      .then(({ data }) => {
        const taken = new Set<string>(
          (data ?? []).map((a) => (a.start_time as string).slice(0, 5)),
        );
        setBookedSet(taken);
        setConflictCount(taken.size);
      });
  }, [date, counselorId]);

  function toggleSlot(start: string) {
    if (bookedSet.has(start)) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(start)) next.delete(start);
      else next.add(start);
      return next;
    });
  }

  function quickSelect(which: "morning" | "afternoon" | "all" | "clear") {
    setSelected((prev) => {
      const next = new Set(prev);
      if (which === "clear") {
        return new Set<string>();
      }
      const target =
        which === "morning" ? MORNING_SLOTS : which === "afternoon" ? AFTERNOON_SLOTS : GRID_SLOTS;
      for (const s of target) {
        if (!bookedSet.has(s)) next.add(s);
      }
      return next;
    });
  }

  function reset() {
    setDate("");
    setFullDay(false);
    setSelected(new Set());
    setReason("");
    setError(null);
  }

  async function save() {
    setError(null);
    if (!date) {
      setError("Pick a date first.");
      return;
    }
    if (!fullDay && selected.size === 0) {
      setError("Select at least one slot, or toggle Block entire day.");
      return;
    }

    setPending(true);
    const supabase = createClient();

    if (fullDay) {
      const { data, error: insertError } = await supabase
        .from("unavailable_dates")
        .insert({
          counselor_id: counselorId,
          date,
          full_day: true,
          start_time: null,
          end_time: null,
          reason: reason.trim() || null,
        })
        .select("id, counselor_id, date, full_day, start_time, end_time, reason, created_at")
        .single();
      setPending(false);
      if (insertError || !data) {
        setError(insertError?.message ?? "Could not save.");
        return;
      }
      setRows((prev) =>
        [...prev, data as UnavailableDateRow].sort((a, b) => a.date.localeCompare(b.date)),
      );
    } else {
      const windows = compress(Array.from(selected));
      const inserts = windows.map((w) => ({
        counselor_id: counselorId,
        date,
        full_day: false,
        start_time: w.start,
        end_time: w.end,
        reason: reason.trim() || null,
      }));
      const { data, error: insertError } = await supabase
        .from("unavailable_dates")
        .insert(inserts)
        .select("id, counselor_id, date, full_day, start_time, end_time, reason, created_at");
      setPending(false);
      if (insertError || !data) {
        setError(insertError?.message ?? "Could not save.");
        return;
      }
      setRows((prev) =>
        [...prev, ...((data ?? []) as UnavailableDateRow[])].sort((a, b) =>
          a.date.localeCompare(b.date),
        ),
      );
    }

    reset();
    router.refresh();
  }

  async function remove(id: string) {
    const supabase = createClient();
    const { error: deleteError } = await supabase.from("unavailable_dates").delete().eq("id", id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
    router.refresh();
  }

  const groupedExisting = useMemo(() => {
    const map = new Map<string, UnavailableDateRow[]>();
    for (const r of rows) {
      const arr = map.get(r.date) ?? [];
      arr.push(r);
      map.set(r.date, arr);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [rows]);

  return (
    <div className="space-y-6">
      <Card padding="lg">
        <div className="space-y-4">
          <Input
            label="Date"
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />

          <label className={`allday-toggle ${fullDay ? "active" : ""}`}>
            <input
              type="checkbox"
              checked={fullDay}
              onChange={(e) => setFullDay(e.target.checked)}
              className="h-4 w-4 accent-[color:var(--color-sage)]"
            />
            <span className="text-sm font-medium">Block entire day</span>
          </label>

          {!fullDay && date && (
            <div>
              <div className="quick-btns">
                <button
                  type="button"
                  className="quick-btn"
                  onClick={() => quickSelect("morning")}
                >
                  Morning
                </button>
                <button
                  type="button"
                  className="quick-btn"
                  onClick={() => quickSelect("afternoon")}
                >
                  Afternoon
                </button>
                <button type="button" className="quick-btn" onClick={() => quickSelect("all")}>
                  Select all
                </button>
                <button type="button" className="quick-btn" onClick={() => quickSelect("clear")}>
                  Clear all
                </button>
              </div>
              <div className="slot-grid">
                {GRID_SLOTS.map((s) => {
                  const hasBooking = bookedSet.has(s);
                  const blocked = selected.has(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleSlot(s)}
                      disabled={hasBooking}
                      aria-pressed={blocked}
                      aria-label={`${formatDisplayTime(s)}${hasBooking ? " (already booked)" : ""}`}
                      className={`slot-btn ${blocked ? "blocked" : ""} ${hasBooking ? "has-booking" : ""}`}
                    >
                      {formatDisplayTime(s)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <Textarea
            label="Internal note (optional)"
            helperText="Students only see &ldquo;Counselor unavailable.&rdquo;"
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />

          {conflictCount !== null && conflictCount > 0 && (
            <div
              role="alert"
              className="rounded-md bg-warning-light px-4 py-3 text-sm text-[color:var(--color-warning)]"
            >
              <strong>
                You have {conflictCount} appointment{conflictCount === 1 ? "" : "s"} on this date.
              </strong>{" "}
              Handle them manually before saving — this will not auto-cancel them.
            </div>
          )}

          {error && (
            <p role="alert" className="text-sm text-[color:var(--color-danger)]">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={reset} disabled={pending}>
              Cancel
            </Button>
            <Button onClick={save} disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </Card>

      <div className="space-y-3">
        <h3 className="font-serif text-lg text-ink">Scheduled time off</h3>
        {groupedExisting.length === 0 ? (
          <Card padding="sm">
            <p className="text-sm text-ink-subtle">No time off scheduled.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {groupedExisting.map(([d, items]) => (
              <Card key={d} padding="sm">
                <div className="mb-2 text-sm font-medium text-ink">{formatDisplayDate(d)}</div>
                <ul className="space-y-1.5">
                  {items.map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-ink-muted">
                        {r.full_day
                          ? "All day"
                          : `${formatDisplayTime((r.start_time ?? "").slice(0, 5))} – ${formatDisplayTime((r.end_time ?? "").slice(0, 5))}`}
                        {r.reason && <span className="ml-2 text-ink-subtle">· {r.reason}</span>}
                      </span>
                      <Button variant="ghost" size="sm" onClick={() => remove(r.id)}>
                        Remove
                      </Button>
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
