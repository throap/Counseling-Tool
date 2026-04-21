"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import StatusBadge from "@/components/StatusBadge";
import { formatDisplayDate, formatDisplayTime } from "@/lib/slots";
import type { AppointmentStatus } from "@/lib/types";

interface Item {
  id: string;
  date: string;
  startTime: string;
  status: AppointmentStatus;
  reason: string | null;
  counselorName: string;
  counselorDepartment: string;
}

interface Props {
  upcoming: Item[];
  past: Item[];
  autoCancelId?: string;
}

export default function AppointmentList({ upcoming, past, autoCancelId }: Props) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const autoTriggered = useRef(false);

  const cancel = useCallback(
    async (id: string) => {
      setPendingId(id);
      setError(null);
      const res = await fetch("/api/appointments/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId: id }),
      });
      setPendingId(null);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Could not cancel appointment");
        return;
      }
      router.refresh();
    },
    [router],
  );

  useEffect(() => {
    if (!autoCancelId || autoTriggered.current) return;
    if (upcoming.some((a) => a.id === autoCancelId)) {
      autoTriggered.current = true;
      if (window.confirm("Cancel this appointment?")) {
        void cancel(autoCancelId);
      }
    }
  }, [autoCancelId, upcoming, cancel]);

  return (
    <div className="space-y-8">
      {error && (
        <div
          role="alert"
          className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200"
        >
          {error}
        </div>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Upcoming</h2>
        {upcoming.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
            No upcoming appointments.
          </p>
        ) : (
          <ul className="space-y-3">
            {upcoming.map((a) => (
              <li
                key={a.id}
                className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-900">{a.counselorName}</span>
                    <StatusBadge status={a.status} />
                  </div>
                  <p className="text-sm text-slate-600">
                    {formatDisplayDate(a.date)} · {formatDisplayTime(a.startTime)} ·{" "}
                    {a.counselorDepartment}
                  </p>
                  {a.reason && (
                    <p className="mt-1 text-sm italic text-slate-500">“{a.reason}”</p>
                  )}
                </div>
                <button
                  onClick={() => cancel(a.id)}
                  disabled={pendingId === a.id}
                  className="self-start rounded-md border border-rose-300 bg-white px-3 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-60 sm:self-auto"
                >
                  {pendingId === a.id ? "Cancelling…" : "Cancel"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Past</h2>
        {past.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
            No past appointments yet.
          </p>
        ) : (
          <ul className="space-y-3">
            {past.map((a) => (
              <li
                key={a.id}
                className="flex flex-col gap-1 rounded-lg border border-slate-200 bg-white p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-slate-900">{a.counselorName}</span>
                  <StatusBadge status={a.status} />
                </div>
                <p className="text-sm text-slate-600">
                  {formatDisplayDate(a.date)} · {formatDisplayTime(a.startTime)} ·{" "}
                  {a.counselorDepartment}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
