"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FULL_DAY_NAMES, formatDisplayTime } from "@/lib/slots";
import { Card } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

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
    <div className="space-y-6">
      <Card>
        <form onSubmit={addBlock} className="grid grid-cols-1 gap-3 sm:grid-cols-5 sm:items-end">
          <Select label="Day" value={day} onChange={(e) => setDay(Number(e.target.value))}>
            {FULL_DAY_NAMES.map((d, i) => <option key={d} value={i}>{d}</option>)}
          </Select>
          <Input label="Start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
          <Input label="End" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
          <Input
            label="Slot (min)"
            type="number"
            min={15}
            step={15}
            value={slotDuration}
            onChange={(e) => setSlotDuration(Number(e.target.value))}
          />
          <Button type="submit" disabled={pending} fullWidth>
            {pending ? "Adding…" : "Add block"}
          </Button>
        </form>
        {error && (
          <p role="alert" className="mt-3 text-sm text-[color:var(--color-danger)]">
            {error}
          </p>
        )}
      </Card>

      <div className="space-y-3">
        {FULL_DAY_NAMES.map((name, i) => {
          const items = grouped.get(i) ?? [];
          return (
            <Card key={name} padding="sm">
              <div className="mb-2 font-serif text-base text-ink">{name}</div>
              {items.length === 0 ? (
                <p className="text-sm text-ink-subtle">No availability</p>
              ) : (
                <ul className="flex flex-wrap gap-2">
                  {items.map((b) => (
                    <li
                      key={b.id}
                      className="flex items-center gap-2 rounded-full bg-sage-light px-3 py-1 text-sm text-sage-dark"
                    >
                      {formatDisplayTime(b.startTime)} – {formatDisplayTime(b.endTime)} ({b.slotDuration}m)
                      <button
                        onClick={() => removeBlock(b.id)}
                        className="rounded-full text-sage-dark hover:text-[color:var(--color-danger)]"
                        aria-label="Remove"
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
