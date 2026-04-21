import type { AvailabilityRow, AppointmentRow } from "./types";

export interface Slot {
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM (24-hour)
  dayOfWeek: number;
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

export function formatDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseTime(hhmm: string): { h: number; m: number } {
  const [h, m] = hhmm.split(":").map(Number);
  return { h: h ?? 0, m: m ?? 0 };
}

export function formatTime(h: number, m: number): string {
  return `${pad(h)}:${pad(m)}`;
}

export function minutesBetween(start: string, end: string): number {
  const s = parseTime(start);
  const e = parseTime(end);
  return e.h * 60 + e.m - (s.h * 60 + s.m);
}

export function addMinutes(hhmm: string, add: number): string {
  const { h, m } = parseTime(hhmm);
  const total = h * 60 + m + add;
  return formatTime(Math.floor(total / 60) % 24, total % 60);
}

export function startOfWeek(d: Date): Date {
  const copy = new Date(d);
  const day = copy.getDay();
  copy.setDate(copy.getDate() - day);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function weekDates(start: Date): Date[] {
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }
  return days;
}

/**
 * Generate bookable slots for a counselor across a given week.
 * Excludes slots already booked (status = 'booked') and slots in the past.
 */
export function generateSlots(
  availability: AvailabilityRow[],
  booked: Pick<AppointmentRow, "appointment_date" | "start_time" | "status">[],
  weekStart: Date,
  now: Date = new Date(),
): Slot[] {
  const bookedSet = new Set(
    booked
      .filter((b) => b.status === "booked")
      .map((b) => `${b.appointment_date}|${b.start_time.slice(0, 5)}`),
  );

  const slots: Slot[] = [];

  for (const d of weekDates(weekStart)) {
    const dow = d.getDay();
    const dateStr = formatDate(d);

    const blocksForDay = availability.filter((a) => a.day_of_week === dow);
    for (const block of blocksForDay) {
      const total = minutesBetween(block.start_time, block.end_time);
      const dur = block.slot_duration_minutes || 30;
      const count = Math.floor(total / dur);
      for (let i = 0; i < count; i++) {
        const startHHMM = addMinutes(block.start_time, i * dur);
        const key = `${dateStr}|${startHHMM}`;
        if (bookedSet.has(key)) continue;

        const slotDate = new Date(`${dateStr}T${startHHMM}:00`);
        if (slotDate.getTime() <= now.getTime()) continue;

        slots.push({ date: dateStr, startTime: startHHMM, dayOfWeek: dow });
      }
    }
  }

  return slots;
}

export const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const FULL_DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function formatDisplayTime(hhmm: string): string {
  const { h, m } = parseTime(hhmm);
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${pad(m)} ${suffix}`;
}

export function formatDisplayDate(yyyymmdd: string): string {
  const [y, mo, d] = yyyymmdd.split("-").map(Number);
  const date = new Date(y, mo - 1, d);
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
