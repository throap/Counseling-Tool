"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignOutButton() {
  const router = useRouter();

  async function onSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={onSignOut}
      className="rounded bg-white/15 px-3 py-1.5 text-sm hover:bg-white/25"
    >
      Sign out
    </button>
  );
}
