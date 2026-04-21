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
      className="rounded-md bg-white/10 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-white/20"
    >
      Sign out
    </button>
  );
}
