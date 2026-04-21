"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import StatusBadge from "@/components/StatusBadge";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { formatDisplayDate, formatDisplayTime } from "@/lib/slots";
import type { AppointmentStatus, ReasonCategory } from "@/lib/types";

interface Row {
  id: string;
  date: string;
  startTime: string;
  status: AppointmentStatus;
  reason: string | null;
  reasonCategory: ReasonCategory | null;
  isPinned: boolean;
  studentName: string;
  studentEmail: string;
  studentId: string | null;
  schoolName: string | null;
  svcteCourse: string | null;
}

interface Filters {
  q: string;
  date: string;
  category: ReasonCategory | "all";
  status: AppointmentStatus | "all";
}

interface Props {
  rows: Row[];
  filters: Filters;
  categories: ReasonCategory[];
}

export default function CounselorAppointmentList({ rows, filters, categories }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const [q, setQ] = useState(filters.q);
  const [date, setDate] = useState(filters.date);
  const [category, setCategory] = useState<ReasonCategory | "all">(filters.category);
  const [status, setStatus] = useState<AppointmentStatus | "all">(filters.status);

  // Local optimistic state for pin toggles — key = row id, value = override pin state.
  const [pinOverrides, setPinOverrides] = useState<Record<string, boolean>>({});
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const effectiveRows = useMemo(
    () =>
      rows.map((r) => ({
        ...r,
        isPinned: r.id in pinOverrides ? pinOverrides[r.id] : r.isPinned,
      })),
    [rows, pinOverrides],
  );

  // Debounced text search — push to URL 300ms after typing stops.
  useEffect(() => {
    if (q === filters.q) return;
    const t = setTimeout(() => pushParams({ q }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function pushParams(patch: Partial<Filters>) {
    const next = { q, date, category, status, ...patch };
    const params = new URLSearchParams();
    if (next.q) params.set("q", next.q);
    if (next.date) params.set("date", next.date);
    if (next.category && next.category !== "all") params.set("category", next.category);
    if (next.status && next.status !== "all") params.set("status", next.status);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function reset() {
    setQ("");
    setDate("");
    setCategory("all");
    setStatus("all");
    router.push(pathname);
  }

  async function togglePin(id: string, current: boolean) {
    setPendingId(id);
    setError(null);
    // Optimistic toggle
    setPinOverrides((prev) => ({ ...prev, [id]: !current }));
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("appointments")
      .update({ is_pinned: !current })
      .eq("id", id);
    setPendingId(null);
    if (updateError) {
      // Revert on error
      setPinOverrides((prev) => ({ ...prev, [id]: current }));
      setError(updateError.message);
      return;
    }
    router.refresh();
  }

  async function markCompleted(id: string) {
    setPendingId(id);
    setError(null);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("appointments")
      .update({ status: "completed" })
      .eq("id", id);
    setPendingId(null);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    router.refresh();
  }

  const hasFilters =
    filters.q || filters.date || filters.category !== "all" || filters.status !== "all";

  return (
    <div className="space-y-4">
      <Card>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            label="Search by student"
            type="search"
            placeholder="Name…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <Input
            label="Date"
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              pushParams({ date: e.target.value });
            }}
          />
          <Select
            label="Reason"
            value={category}
            onChange={(e) => {
              const v = e.target.value as ReasonCategory | "all";
              setCategory(v);
              pushParams({ category: v });
            }}
          >
            <option value="all">All reasons</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          <Select
            label="Status"
            value={status}
            onChange={(e) => {
              const v = e.target.value as AppointmentStatus | "all";
              setStatus(v);
              pushParams({ status: v });
            }}
          >
            <option value="all">All statuses</option>
            <option value="booked">Booked</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </Select>
        </div>
        {hasFilters && (
          <div className="mt-3 flex justify-end">
            <Button variant="ghost" size="sm" onClick={reset}>
              Clear filters
            </Button>
          </div>
        )}
      </Card>

      {error && (
        <div
          role="alert"
          className="rounded-md bg-danger-light px-4 py-2.5 text-sm text-[color:var(--color-danger)]"
        >
          {error}
        </div>
      )}

      {effectiveRows.length === 0 ? (
        <Card className="text-center text-sm text-ink-muted">
          No appointments match your filters.
        </Card>
      ) : (
        <ul className="space-y-3">
          {effectiveRows.map((r) => (
            <li key={r.id}>
              <Card
                className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${
                  r.isPinned ? "ring-1 ring-sage/40" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => togglePin(r.id, r.isPinned)}
                    disabled={pendingId === r.id}
                    aria-pressed={r.isPinned}
                    aria-label={r.isPinned ? "Unpin appointment" : "Pin appointment"}
                    className={`mt-0.5 rounded-md p-1.5 text-lg leading-none transition-colors ${
                      r.isPinned
                        ? "bg-sage-light text-sage-dark"
                        : "text-ink-subtle hover:bg-surface-muted hover:text-ink"
                    }`}
                  >
                    {r.isPinned ? "📌" : "📍"}
                  </button>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-ink">{r.studentName}</span>
                      {r.studentId && (
                        <span className="text-xs text-ink-subtle">#{r.studentId}</span>
                      )}
                      <StatusBadge status={r.status} />
                      {r.reasonCategory && (
                        <span className="rounded-full bg-seablue-light px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-seablue-dark">
                          {r.reasonCategory}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-ink-muted">
                      {formatDisplayDate(r.date)} · {formatDisplayTime(r.startTime)} · {r.studentEmail}
                    </p>
                    {(r.schoolName || r.svcteCourse) && (
                      <p className="mt-1 text-sm text-ink-muted">
                        {[r.schoolName, r.svcteCourse].filter(Boolean).join(" · ")}
                      </p>
                    )}
                    {r.reason && (
                      <p className="mt-1 text-sm italic text-ink-subtle">
                        &ldquo;{r.reason}&rdquo;
                      </p>
                    )}
                  </div>
                </div>
                {r.status === "booked" && (
                  <Button
                    variant="ghost"
                    onClick={() => markCompleted(r.id)}
                    disabled={pendingId === r.id}
                  >
                    {pendingId === r.id ? "Saving…" : "Mark completed"}
                  </Button>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
