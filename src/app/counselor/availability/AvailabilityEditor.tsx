"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FULL_DAY_NAMES, formatDisplayTime } from "@/lib/slots";

interface Block {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDuration: number;
}

export default function AvailabilityEditor({
  counselorId,
  initial,
}: {
  counselorId: string;
  initial: Block[];
}) {
  const router = useRouter();
  const [blocks, setBlocks] = useState<Block[]>(initial);
  const [day, setDay] = useState(1);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("12:00");
  const [slotDuration, setSlotDuration] = useState(30);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function addBlock(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (endTime <= startTime) {
      setError("End time must be after start time.");
      return;
    }

    setPending(true);
    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from("availability")
      .insert({
        counselor_id: counselorId,
        day_of_week: day,
        start_time: startTime,
        end_time: endTime,
        slot_duration_minutes: slotDuration,
      })
      .select("id, day_of_week, start_time, end_time, slot_duration_minutes")
      .single();
    setPending(false);

    if (insertError || !data) {
      setError(insertError?.message ?? "Could not add availability");
      return;
    }

    setBlocks((prev) =>
      [
        ...prev,
        {
          id: data.id,
          dayOfWeek: data.day_of_week,
          startTime: data.start_time.slice(0, 5),
          endTime: data.end_time.slice(0, 5),
          slotDuration: data.slot_duration_minutes,
        },
      ].sort((a, b) =>
        a.dayOfWeek !== b.dayOfWeek ? a.dayOfWeek - b.dayOfWeek : a.startTime.localeCompare(b.startTime),
      ),
    );
    router.refresh();
  }

  async function removeBlock(id: string) {
    const supabase = createClient();
    const { error: deleteError } = await supabase.from("availability").delete().eq("id", id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    router.refresh();
  }

  const grouped = new Map<number, Block[]>();
  for (const b of blocks) {
    const arr = grouped.get(b.dayOfWeek) ?? [];
    arr.push(b);
    grouped.set(b.dayOfWeek, arr);
  }

  return (
    <div className="space-y-8">
      <form
        onSubmit={addBlock}
        className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-5"
      >
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Day</label>
          <select
            value={day}
            onChange={(e) => setDay(Number(e.target.value))}
            className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm"
          >
            {FULL_DAY_NAMES.map((d, i) => (
              <option key={d} value={i}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Start</label>
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
            className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">End</label>
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            required
            className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Slot (min)</label>
          <input
            type="number"
            min={15}
            step={15}
            value={slotDuration}
            onChange={(e) => setSlotDuration(Number(e.target.value))}
            className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm"
          />
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {pending ? "Adding…" : "Add block"}
          </button>
        </div>
      </form>

      {error && (
        <div
          role="alert"
          className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200"
        >
          {error}
        </div>
      )}

      <div className="space-y-3">
        {FULL_DAY_NAMES.map((name, i) => {
          const items = grouped.get(i) ?? [];
          return (
            <div
              key={name}
              className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="mb-2 font-semibold text-slate-900">{name}</div>
              {items.length === 0 ? (
                <p className="text-sm text-slate-400">No availability</p>
              ) : (
                <ul className="flex flex-wrap gap-2">
                  {items.map((b) => (
                    <li
                      key={b.id}
                      className="flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-sm text-brand-800"
                    >
                      {formatDisplayTime(b.startTime)} – {formatDisplayTime(b.endTime)} (
                      {b.slotDuration}m)
                      <button
                        onClick={() => removeBlock(b.id)}
                        className="rounded-full text-brand-700 hover:text-rose-700"
                        aria-label="Remove"
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
