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
import type { AvailabilityRow, AppointmentRow, ReasonCategory } from "@/lib/types";
import { REASON_CATEGORIES } from "@/lib/types";
import type { UnavailableDateRow } from "@/types/unavailable-dates";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";

interface CounselorOption {
  id: string;
  name: string;
  department: string;
}

interface Props {
  defaultStudentName: string;
  counselors: CounselorOption[];
  availability: AvailabilityRow[];
  booked: Pick<AppointmentRow, "counselor_id" | "appointment_date" | "start_time" | "status">[];
  unavailable: UnavailableDateRow[];
  prefill: { counselorId?: string; date?: string; time?: string };
}

type Step = 1 | 2 | 3;
const PHONE_REGEX = /^\+?[\d\s\-()]{7,15}$/;

export default function BookingFlow({
  defaultStudentName,
  counselors,
  availability,
  booked,
  unavailable,
  prefill,
}: Props) {
  const router = useRouter();

  const initialWeekStart = prefill.date
    ? startOfWeek(new Date(`${prefill.date}T00:00:00`))
    : startOfWeek(new Date());

  // State preserved across steps; navigating back does not clear fields.
  const [step, setStep] = useState<Step>(1);

  // Step 1
  const [studentName, setStudentName] = useState(defaultStudentName);
  const [studentPhone, setStudentPhone] = useState("");

  // Step 2
  const [counselorId, setCounselorId] = useState(prefill.counselorId ?? "");
  const [weekStart, setWeekStart] = useState<Date>(initialWeekStart);
  const [selected, setSelected] = useState<Slot | null>(
    prefill.counselorId && prefill.date && prefill.time
      ? {
          date: prefill.date,
          startTime: prefill.time,
          dayOfWeek: new Date(`${prefill.date}T00:00:00`).getDay(),
        }
      : null,
  );
  const [reasonCategory, setReasonCategory] = useState<ReasonCategory | "">("");
  const [reason, setReason] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const counselorName =
    counselors.find((c) => c.id === counselorId)?.name ?? "";

  const counselorAvailability = useMemo(
    () => availability.filter((a) => a.counselor_id === counselorId),
    [availability, counselorId],
  );
  const counselorBooked = useMemo(
    () => booked.filter((b) => b.counselor_id === counselorId),
    [booked, counselorId],
  );
  const counselorUnavailable = useMemo(
    () => unavailable.filter((u) => u.counselor_id === counselorId),
    [unavailable, counselorId],
  );

  const slotsByDate = useMemo(() => {
    if (!counselorId) return new Map<string, Slot[]>();
    const all = generateSlots(
      counselorAvailability,
      counselorBooked,
      weekStart,
      counselorUnavailable,
    );
    const byDate = new Map<string, Slot[]>();
    for (const s of all) {
      const arr = byDate.get(s.date) ?? [];
      arr.push(s);
      byDate.set(s.date, arr);
    }
    return byDate;
  }, [counselorAvailability, counselorBooked, counselorUnavailable, counselorId, weekStart]);

  const days = weekDates(weekStart);

  function shiftWeek(offset: number) {
    const next = new Date(weekStart);
    next.setDate(weekStart.getDate() + offset * 7);
    setWeekStart(next);
  }

  function validateStep1(): boolean {
    const e: Record<string, string> = {};
    if (!studentName.trim()) e.studentName = "Name is required.";
    if (!studentPhone.trim()) e.studentPhone = "Phone number is required.";
    else if (!PHONE_REGEX.test(studentPhone.trim()))
      e.studentPhone = "Enter a valid phone number.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function validateStep2(): boolean {
    const e: Record<string, string> = {};
    if (!counselorId) e.counselor = "Pick a counselor.";
    if (!selected) e.slot = "Pick an open time slot.";
    if (!reasonCategory) e.reasonCategory = "Pick a reason category.";
    if (!reason.trim()) e.reason = "Please describe what you'd like to discuss.";
    else if (reason.trim().length < 20)
      e.reason = "Description must be at least 20 characters.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit() {
    if (!selected || !reasonCategory || !counselorId) return;
    setPending(true);
    setApiError(null);

    const res = await fetch("/api/appointments/book", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        counselorId,
        appointmentDate: selected.date,
        startTime: selected.startTime,
        studentName: studentName.trim(),
        studentPhone: studentPhone.trim(),
        reasonCategory,
        reason: reason.trim(),
        additionalNotes: additionalNotes.trim() || null,
      }),
    });

    const body = await res.json().catch(() => ({}));
    setPending(false);

    if (!res.ok) {
      setApiError(body.error ?? "Could not book this slot. It may have just been taken.");
      return;
    }

    router.push("/student/appointments?booked=1");
    router.refresh();
  }

  const stepLabels = ["Your details", "Counselor & time", "Review"];

  return (
    <div className="space-y-6">
      <ol className="flex flex-wrap items-center gap-3 text-xs font-medium text-ink-subtle">
        {stepLabels.map((label, i) => {
          const n = (i + 1) as Step;
          const active = step === n;
          const done = step > n;
          return (
            <li key={label} className="flex items-center gap-2">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                  active
                    ? "bg-sage text-white"
                    : done
                      ? "bg-sage-light text-sage-dark"
                      : "bg-surface-muted text-ink-subtle"
                }`}
              >
                {i + 1}
              </span>
              <span className={active ? "text-ink" : ""}>{label}</span>
              {i < 2 && <span className="w-6 border-t border-line" />}
            </li>
          );
        })}
      </ol>

      {step === 1 && (
        <Card padding="lg" className="space-y-4">
          <h2 className="font-serif text-2xl text-ink">Your details</h2>
          <Input
            label="Full name"
            required
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            error={errors.studentName}
          />
          <Input
            label="Phone number"
            type="tel"
            required
            placeholder="(555) 123-4567"
            value={studentPhone}
            onChange={(e) => setStudentPhone(e.target.value)}
            error={errors.studentPhone}
            helperText="Your counselor may use this to reach you."
          />
          <div className="flex justify-end">
            <Button
              onClick={() => {
                if (validateStep1()) setStep(2);
              }}
            >
              Continue →
            </Button>
          </div>
        </Card>
      )}

      {step === 2 && (
        <Card padding="lg" className="space-y-4">
          <h2 className="font-serif text-2xl text-ink">Counselor &amp; time</h2>

          <Select
            label="Counselor"
            required
            value={counselorId}
            onChange={(e) => {
              setCounselorId(e.target.value);
              setSelected(null);
            }}
            error={errors.counselor}
          >
            <option value="">Choose a counselor…</option>
            {counselors.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.department}
              </option>
            ))}
          </Select>

          {counselorId && (
            <>
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" onClick={() => shiftWeek(-1)}>
                  ← Previous
                </Button>
                <span className="text-sm font-medium text-ink">
                  Week of {formatDisplayDate(formatDate(weekStart))}
                </span>
                <Button variant="ghost" size="sm" onClick={() => shiftWeek(1)}>
                  Next →
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-7">
                {days.map((d) => {
                  const dateStr = formatDate(d);
                  const slots = slotsByDate.get(dateStr) ?? [];
                  const has = slots.length > 0;
                  return (
                    <Card key={dateStr} padding="sm" className={has ? "" : "opacity-60"}>
                      <div className="mb-2 border-b border-line pb-2">
                        <div className="text-xs font-medium uppercase tracking-wide text-ink-subtle">
                          {DAY_NAMES[d.getDay()]}
                        </div>
                        <div className="text-sm font-medium text-ink">
                          {d.getMonth() + 1}/{d.getDate()}
                        </div>
                      </div>
                      {!has ? (
                        <p className="py-1 text-xs text-ink-subtle">None</p>
                      ) : (
                        <div className="flex flex-col gap-1">
                          {slots.map((s) => {
                            const sel =
                              selected?.date === s.date && selected?.startTime === s.startTime;
                            return (
                              <button
                                key={`${s.date}-${s.startTime}`}
                                type="button"
                                onClick={() => setSelected(s)}
                                className={`rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                                  sel
                                    ? "bg-sage text-white"
                                    : "bg-sage-light text-sage-dark hover:bg-sage/20"
                                }`}
                              >
                                {formatDisplayTime(s.startTime)}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
              {errors.slot && (
                <p role="alert" className="text-sm text-[color:var(--color-danger)]">
                  {errors.slot}
                </p>
              )}
            </>
          )}

          <Select
            label="Reason category"
            required
            value={reasonCategory}
            onChange={(e) => setReasonCategory(e.target.value as ReasonCategory)}
            error={errors.reasonCategory}
          >
            <option value="">Choose a category…</option>
            {REASON_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>

          <Textarea
            label="What would you like to discuss?"
            required
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            error={errors.reason}
            helperText={`${reason.trim().length} / 20 characters minimum`}
          />

          <Textarea
            label="Additional notes (optional)"
            rows={3}
            value={additionalNotes}
            onChange={(e) => setAdditionalNotes(e.target.value)}
          />

          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep(1)}>
              ← Back
            </Button>
            <Button
              onClick={() => {
                if (validateStep2()) setStep(3);
              }}
            >
              Review →
            </Button>
          </div>
        </Card>
      )}

      {step === 3 && selected && (
        <Card padding="lg" className="space-y-4">
          <h2 className="font-serif text-2xl text-ink">Review &amp; confirm</h2>

          <dl className="divide-y divide-line rounded-md border border-line bg-surface-muted/40">
            {[
              ["Name", studentName],
              ["Phone", studentPhone],
              ["Counselor", counselorName],
              [
                "When",
                `${formatDisplayDate(selected.date)} at ${formatDisplayTime(selected.startTime)}`,
              ],
              ["Category", reasonCategory],
              ["Description", reason],
              ...(additionalNotes
                ? [["Additional notes", additionalNotes] as [string, string]]
                : []),
            ].map(([label, value]) => (
              <div
                key={label}
                className="grid grid-cols-[140px_1fr] gap-2 px-4 py-3 text-sm"
              >
                <dt className="text-ink-subtle">{label}</dt>
                <dd className="whitespace-pre-wrap text-ink">{value}</dd>
              </div>
            ))}
          </dl>

          {apiError && (
            <p role="alert" className="text-sm text-[color:var(--color-danger)]">
              {apiError}
            </p>
          )}

          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep(2)}>
              ← Back
            </Button>
            <Button onClick={submit} disabled={pending}>
              {pending ? "Booking…" : "Confirm booking"}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
