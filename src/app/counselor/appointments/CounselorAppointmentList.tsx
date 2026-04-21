"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import StatusBadge from "@/components/StatusBadge";
import { formatDisplayDate, formatDisplayTime } from "@/lib/slots";
import type { AppointmentStatus } from "@/lib/types";

interface Row {
  id: string;
  date: string;
  startTime: string;
  status: AppointmentStatus;
  reason: string | null;
  studentName: string;
  studentEmail: string;
  studentId: string | null;
}

export default function CounselorAppointmentList({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
        No appointments yet.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div
          role="alert"
          className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200"
        >
          {error}
        </div>
      )}
      <ul className="space-y-3">
        {rows.map((r) => (
          <li
            key={r.id}
            className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-slate-900">{r.studentName}</span>
                {r.studentId && (
                  <span className="text-xs text-slate-500">#{r.studentId}</span>
                )}
                <StatusBadge status={r.status} />
              </div>
              <p className="text-sm text-slate-600">
                {formatDisplayDate(r.date)} · {formatDisplayTime(r.startTime)} · {r.studentEmail}
              </p>
              {r.reason && (
                <p className="mt-1 text-sm italic text-slate-500">“{r.reason}”</p>
              )}
            </div>
            {r.status === "booked" && (
              <button
                onClick={() => markCompleted(r.id)}
                disabled={pendingId === r.id}
                className="self-start rounded-md border border-emerald-300 bg-white px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-60 sm:self-auto"
              >
                {pendingId === r.id ? "Saving…" : "Mark completed"}
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
