"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, dateFnsLocalizer, Views, type View } from "react-big-calendar";
import { format, parse, startOfWeek as dfStartOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Input";
import { generateSlots, startOfWeek } from "@/lib/slots";
import type { AvailabilityRow, AppointmentRow } from "@/lib/types";
import type { UnavailableDateRow } from "@/types/unavailable-dates";

import "react-big-calendar/lib/css/react-big-calendar.css";

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => dfStartOfWeek(new Date(), { weekStartsOn: 0 }),
  getDay,
  locales: { "en-US": enUS },
});

interface CounselorOption {
  id: string;
  name: string;
  department: string;
}

interface Props {
  counselors: CounselorOption[];
  availability: AvailabilityRow[];
  booked: Pick<AppointmentRow, "counselor_id" | "appointment_date" | "start_time" | "status">[];
  unavailable: UnavailableDateRow[];
}

const COLOR_PALETTE = [
  "#7A9E7E",
  "#6B8CAE",
  "#C9A24C",
  "#9B7EBE",
  "#B8876D",
  "#6BAEA3",
  "#AE6B8C",
];

type Mode = "single" | "all";

interface SlotEvent {
  title: string;
  start: Date;
  end: Date;
  resource: {
    counselorId: string;
    counselorName: string;
    date: string;
    startTime: string;
    color: string;
  };
}

export default function CalendarView({ counselors, availability, booked, unavailable }: Props) {
  const router = useRouter();

  const [mode, setMode] = useState<Mode>("single");
  const [selectedCounselor, setSelectedCounselor] = useState<string>(
    counselors[0]?.id ?? "",
  );
  const [view, setView] = useState<View>(Views.WEEK);
  const [date, setDate] = useState<Date>(new Date());

  const counselorColor = useMemo(() => {
    const map = new Map<string, string>();
    counselors.forEach((c, i) => map.set(c.id, COLOR_PALETTE[i % COLOR_PALETTE.length]));
    return map;
  }, [counselors]);

  const events = useMemo<SlotEvent[]>(() => {
    const includedCounselors =
      mode === "single"
        ? counselors.filter((c) => c.id === selectedCounselor)
        : counselors;

    const weekStart = startOfWeek(date);
    const windows: Date[] = [];
    // Show slots for the visible week plus the next 3 weeks so navigation feels snappy.
    for (let i = 0; i < 4; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i * 7);
      windows.push(d);
    }

    const all: SlotEvent[] = [];
    for (const c of includedCounselors) {
      const avail = availability.filter((a) => a.counselor_id === c.id);
      if (avail.length === 0) continue;
      const taken = booked.filter((b) => b.counselor_id === c.id);
      const unav = unavailable.filter((u) => u.counselor_id === c.id);
      const color = counselorColor.get(c.id) ?? COLOR_PALETTE[0];

      for (const ws of windows) {
        const slots = generateSlots(avail, taken, ws, unav);
        for (const s of slots) {
          const start = new Date(`${s.date}T${s.startTime}:00`);
          const duration =
            avail.find(
              (a) =>
                a.day_of_week === s.dayOfWeek &&
                a.start_time.slice(0, 5) <= s.startTime &&
                a.end_time.slice(0, 5) > s.startTime,
            )?.slot_duration_minutes ?? 30;
          const end = new Date(start.getTime() + duration * 60 * 1000);
          all.push({
            title: mode === "single" ? "Available" : c.name,
            start,
            end,
            resource: {
              counselorId: c.id,
              counselorName: c.name,
              date: s.date,
              startTime: s.startTime,
              color,
            },
          });
        }
      }
    }
    return all;
  }, [mode, selectedCounselor, counselors, availability, booked, unavailable, date, counselorColor]);

  function onSelectEvent(event: SlotEvent) {
    const qs = new URLSearchParams({
      counselorId: event.resource.counselorId,
      date: event.resource.date,
      time: event.resource.startTime,
    });
    router.push(`/student/book?${qs.toString()}`);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="inline-flex gap-1 rounded-md bg-surface-muted p-1 text-sm">
          {(
            [
              ["single", "Single counselor"],
              ["all", "All counselors"],
            ] as [Mode, string][]
          ).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setMode(k)}
              className={`rounded-md px-3 py-1.5 font-medium transition-all ease-smooth ${
                mode === k ? "bg-surface text-sage-dark shadow-soft" : "text-ink-muted hover:text-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {mode === "single" && (
          <Select
            value={selectedCounselor}
            onChange={(e) => setSelectedCounselor(e.target.value)}
            className="min-w-[240px]"
          >
            {counselors.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.department}
              </option>
            ))}
          </Select>
        )}
      </div>

      <Card padding="sm">
        <div className="h-[640px]">
          <Calendar
            localizer={localizer}
            events={events}
            view={view}
            onView={setView}
            date={date}
            onNavigate={setDate}
            views={[Views.WEEK, Views.MONTH]}
            defaultView={Views.WEEK}
            onSelectEvent={(e) => onSelectEvent(e as SlotEvent)}
            eventPropGetter={(e) => {
              const event = e as SlotEvent;
              return {
                style: {
                  backgroundColor: event.resource.color,
                  color: "white",
                  borderRadius: 6,
                  border: "none",
                },
              };
            }}
            messages={{ today: "Today", previous: "Prev", next: "Next" }}
          />
        </div>
      </Card>

      {mode === "all" && (
        <Card padding="sm">
          <div className="text-xs font-medium uppercase tracking-wide text-ink-subtle">Legend</div>
          <ul className="mt-2 flex flex-wrap gap-3 text-sm">
            {counselors.map((c) => (
              <li key={c.id} className="flex items-center gap-2">
                <span
                  className="inline-block h-3 w-3 rounded-full"
                  style={{ backgroundColor: counselorColor.get(c.id) }}
                />
                {c.name}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
