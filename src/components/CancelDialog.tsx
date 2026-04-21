"use client";

import { useMemo, useState } from "react";
import { Modal } from "./ui/Modal";
import { Textarea } from "./ui/Input";
import { Button } from "./ui/Button";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  appointmentId: string;
  appointmentLabel: string;
  hoursUntil: number | null;
}

export default function CancelDialog({
  open,
  onClose,
  onSuccess,
  appointmentId,
  appointmentLabel,
  hoursUntil,
}: Props) {
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const words = useMemo(
    () => reason.trim().split(/\s+/).filter(Boolean).length,
    [reason],
  );
  const isUrgent = hoursUntil !== null && hoursUntil < 1;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (words < 10) {
      setError("Please describe your reason in at least 10 words.");
      return;
    }
    setPending(true);
    const res = await fetch("/api/appointments/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appointmentId, reason }),
    });
    setPending(false);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(body.error ?? "Could not cancel appointment.");
      return;
    }
    setReason("");
    onSuccess();
  }

  function handleClose() {
    if (pending) return;
    setReason("");
    setError(null);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Cancel appointment"
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={pending}>
            Keep appointment
          </Button>
          <Button variant="danger" onClick={onSubmit} disabled={pending}>
            {pending ? "Cancelling…" : "Confirm cancellation"}
          </Button>
        </>
      }
    >
      <p>
        You&rsquo;re cancelling: <strong className="text-ink">{appointmentLabel}</strong>
      </p>

      {isUrgent && (
        <div className="rounded-md bg-warning-light px-4 py-3 text-sm text-[color:var(--color-warning)]">
          <strong>This appointment starts in under an hour.</strong> Cancelling now will
          send an <em>urgent</em> email to the other party. Please only cancel if
          absolutely necessary.
        </div>
      )}

      <form onSubmit={onSubmit}>
        <Textarea
          label="Reason for cancellation"
          required
          rows={4}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Please share why you need to cancel (minimum 10 words)."
          helperText={`${words} / 10 words minimum`}
          error={error ?? undefined}
        />
      </form>
    </Modal>
  );
}
