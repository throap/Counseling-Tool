import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface Body {
  peerId?: string;
}

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const payload = (await req.json().catch(() => null)) as Body | null;
  if (!payload?.peerId) {
    return NextResponse.json({ error: "peerId required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("messages")
    .update({ read: true })
    .eq("recipient_id", user.id)
    .eq("sender_id", payload.peerId)
    .eq("read", false);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
