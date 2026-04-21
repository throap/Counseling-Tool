"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import StatusBadge from "@/components/StatusBadge";
import CancelDialog from "@/components/CancelDialog";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatDisplayDate, formatDisplayTime } from "@/lib/slots";
import type { AppointmentStatus } from "@/lib/types";

interface Item {
  id: string;
  date: string;
  startTime: string;
  status: AppointmentStatus;
  reason: string | null;
  cancellationReason: string | null;
  cancelledBy: "student" | "counselor" | null;
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
  const [dialog, setDialog] = useState<{ id: string; label: string; hoursUntil: number | null } | null>(null);
  const autoTriggered = useRef(false);

  const openCancel = useCallback((item: Item) => {
    const start = new Date(`${item.date}T${item.startTime}`);
    const hoursUntil = (start.getTime() - Date.now()) / (1000 * 60 * 60);
    setDialog({
      id: item.id,
      label: `${item.counselorName} — ${formatDisplayDate(item.date)} at ${formatDisplayTime(item.startTime)}`,
      hoursUntil,
    });
  }, []);

  useEffect(() => {
    if (!autoCancelId || autoTriggered.current) return;
    const match = upcoming.find((a) => a.id === autoCancelId);
    if (match) {
      autoTriggered.current = true;
      openCancel(match);
    }
  }, [autoCancelId, upcoming, openCancel]);

  return (
    <div className="space-y-10">
      <section>
        <h2 className="mb-4 font-serif text-xl text-ink">Upcoming</h2>
        {upcoming.length === 0 ? (
          <Card className="text-center text-sm text-ink-muted">
            No upcoming appointments.
          </Card>
        ) : (
          <ul className="space-y-3">
            {upcoming.map((a) => (
              <li key={a.id}>
                <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-ink">{a.counselorName}</span>
                      <StatusBadge status={a.status} />
                    </div>
                    <p className="mt-1 text-sm text-ink-muted">
                      {formatDisplayDate(a.date)} · {formatDisplayTime(a.startTime)} · {a.counselorDepartment}
                    </p>
                    {a.reason && (
                      <p className="mt-1 text-sm italic text-ink-subtle">&ldquo;{a.reason}&rdquo;</p>
                    )}
                  </div>
                  <Button variant="ghost" onClick={() => openCancel(a)}>
                    Cancel
                  </Button>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-4 font-serif text-xl text-ink">Past</h2>
        {past.length === 0 ? (
          <Card className="text-center text-sm text-ink-muted">
            No past appointments yet.
          </Card>
        ) : (
          <ul className="space-y-3">
            {past.map((a) => (
              <li key={a.id}>
                <Card padding="sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-ink">{a.counselorName}</span>
                    <StatusBadge status={a.status} />
                  </div>
                  <p className="mt-0.5 text-sm text-ink-muted">
                    {formatDisplayDate(a.date)} · {formatDisplayTime(a.startTime)} · {a.counselorDepartment}
                  </p>
                  {a.status === "cancelled" && a.cancellationReason && (
                    <p className="mt-1 text-xs text-ink-subtle">
                      Cancelled by {a.cancelledBy ?? "someone"}: {a.cancellationReason}
                    </p>
                  )}
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      {dialog && (
        <CancelDialog
          open
          onClose={() => setDialog(null)}
          onSuccess={() => {
            setDialog(null);
            router.refresh();
          }}
          appointmentId={dialog.id}
          appointmentLabel={dialog.label}
          hoursUntil={dialog.hoursUntil}
        />
      )}
    </div>
  );
}
