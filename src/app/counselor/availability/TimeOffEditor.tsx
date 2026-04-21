"use client";

import { useEffect, useState } from "react";
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

export default function TimeOffEditor({ counselorId, initial }: Props) {
  const router = useRouter();
  const [rows, setRows] = useState<UnavailableDateRow[]>(initial);
  const [date, setDate] = useState("");
  const [fullDay, setFullDay] = useState(true);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [reason, setReason] = useState("");
  const [conflictCount, setConflictCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!date) {
      setConflictCount(null);
      return;
    }
    const supabase = createClient();
    supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("counselor_id", counselorId)
      .eq("appointment_date", date)
      .eq("status", "booked")
      .then(({ count }) => {
        setConflictCount(count ?? 0);
      });
  }, [date, counselorId]);

  async function addTimeOff(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!date) {
      setError("Please pick a date.");
      return;
    }
    if (!fullDay && endTime <= startTime) {
      setError("End time must be after start time.");
      return;
    }

    setPending(true);
    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from("unavailable_dates")
      .insert({
        counselor_id: counselorId,
        date,
        full_day: fullDay,
        start_time: fullDay ? null : startTime,
        end_time: fullDay ? null : endTime,
        reason: reason.trim() || null,
      })
      .select("id, counselor_id, date, full_day, start_time, end_time, reason, created_at")
      .single();
    setPending(false);

    if (insertError || !data) {
      setError(insertError?.message ?? "Could not save time off.");
      return;
    }

    setRows((prev) =>
      [...prev, data as UnavailableDateRow].sort((a, b) => a.date.localeCompare(b.date)),
    );
    setDate("");
    setReason("");
    setConflictCount(null);
    router.refresh();
  }

  async function removeTimeOff(id: string) {
    const supabase = createClient();
    const { error: deleteError } = await supabase.from("unavailable_dates").delete().eq("id", id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Card>
        <form onSubmit={addTimeOff} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="Date"
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <label className="flex cursor-pointer items-end gap-2 pb-2 text-sm">
              <input
                type="checkbox"
                checked={fullDay}
                onChange={(e) => setFullDay(e.target.checked)}
                className="mb-1 h-4 w-4 accent-[color:var(--color-sage)]"
              />
              Full day off
            </label>
          </div>

          {!fullDay && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                label="Start"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
              <Input
                label="End"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>
          )}

          <Textarea
            label="Reason (optional, internal only)"
            helperText="Students only see &ldquo;Counselor unavailable&rdquo;."
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />

          {conflictCount !== null && conflictCount > 0 && (
            <div
              role="alert"
              className="rounded-md bg-warning-light px-4 py-3 text-sm text-[color:var(--color-warning)]"
            >
              <strong>You have {conflictCount} appointment{conflictCount === 1 ? "" : "s"} on this date.</strong>{" "}
              Handle them manually before saving — this will not auto-cancel them.
            </div>
          )}

          {error && (
            <p role="alert" className="text-sm text-[color:var(--color-danger)]">
              {error}
            </p>
          )}

          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Add time off"}
          </Button>
        </form>
      </Card>

      <div className="space-y-3">
        <h3 className="font-serif text-lg text-ink">Scheduled time off</h3>
        {rows.length === 0 ? (
          <Card padding="sm">
            <p className="text-sm text-ink-subtle">No time off scheduled.</p>
          </Card>
        ) : (
          <ul className="space-y-2">
            {rows.map((r) => (
              <li key={r.id}>
                <Card padding="sm" className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-ink">
                      {formatDisplayDate(r.date)}
                    </div>
                    <div className="text-xs text-ink-muted">
                      {r.full_day
                        ? "All day"
                        : `${formatDisplayTime((r.start_time ?? "").slice(0, 5))} – ${formatDisplayTime((r.end_time ?? "").slice(0, 5))}`}
                      {r.reason && <> · {r.reason}</>}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => removeTimeOff(r.id)}>
                    Remove
                  </Button>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
