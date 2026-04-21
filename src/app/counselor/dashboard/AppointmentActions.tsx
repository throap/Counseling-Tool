"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import CancelDialog from "@/components/CancelDialog";
import { Button } from "@/components/ui/Button";

interface Props {
  appointmentId: string;
  isPinned: boolean;
  appointmentLabel: string;
  hoursUntil: number | null;
  /** When true, always render an "Unpin" button (used from the pinned section). */
  alwaysShowUnpin?: boolean;
}

export default function AppointmentActions({
  appointmentId,
  isPinned,
  appointmentLabel,
  hoursUntil,
  alwaysShowUnpin = false,
}: Props) {
  const router = useRouter();
  const [pinned, setPinned] = useState(isPinned);
  const [pending, setPending] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  async function togglePin() {
    setPending(true);
    const prev = pinned;
    setPinned(!prev);
    const supabase = createClient();
    const { error } = await supabase
      .from("appointments")
      .update({ is_pinned: !prev })
      .eq("id", appointmentId);
    setPending(false);
    if (error) {
      setPinned(prev);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-shrink-0 gap-2">
      {(alwaysShowUnpin || pinned) && (
        <Button variant="ghost" size="sm" onClick={togglePin} disabled={pending}>
          {pinned ? "Unpin" : "Pin"}
        </Button>
      )}
      {!alwaysShowUnpin && !pinned && (
        <Button variant="ghost" size="sm" onClick={togglePin} disabled={pending} aria-label="Pin appointment">
          📌
        </Button>
      )}
      <Button variant="ghost" size="sm" onClick={() => setDialogOpen(true)}>
        Cancel
      </Button>
      <CancelDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSuccess={() => {
          setDialogOpen(false);
          router.refresh();
        }}
        appointmentId={appointmentId}
        appointmentLabel={appointmentLabel}
        hoursUntil={hoursUntil}
      />
    </div>
  );
}
