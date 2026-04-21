"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

export default function UnpinButton({ appointmentId }: { appointmentId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function unpin() {
    setPending(true);
    const supabase = createClient();
    await supabase.from("appointments").update({ is_pinned: false }).eq("id", appointmentId);
    setPending(false);
    router.refresh();
  }

  return (
    <Button variant="ghost" size="sm" onClick={unpin} disabled={pending}>
      {pending ? "Unpinning…" : "Unpin"}
    </Button>
  );
}
