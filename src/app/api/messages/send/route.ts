import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendNewMessageNotice } from "@/lib/email";

interface Body {
  recipientId?: string;
  subject?: string;
  body?: string;
  parentMessageId?: string | null;
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
  if (!payload?.recipientId || !payload.subject?.trim() || !payload.body?.trim()) {
    return NextResponse.json(
      { error: "Recipient, subject, and message are all required." },
      { status: 400 },
    );
  }
  if (payload.recipientId === user.id) {
    return NextResponse.json({ error: "You cannot message yourself." }, { status: 400 });
  }

  const { data: sender } = await supabase
    .from("users")
    .select("id, name, role")
    .eq("id", user.id)
    .single();
  if (!sender) {
    return NextResponse.json({ error: "Profile not found" }, { status: 403 });
  }

  const { data: recipient } = await supabase
    .from("users")
    .select("id, name, email, role")
    .eq("id", payload.recipientId)
    .single();
  if (!recipient) {
    return NextResponse.json({ error: "Recipient not found" }, { status: 404 });
  }

  // Role-pair enforcement (redundant with client filtering, but authoritative).
  if (sender.role === "student") {
    if (recipient.role !== "counselor") {
      return NextResponse.json(
        { error: "Students can only message counselors." },
        { status: 403 },
      );
    }
  } else if (sender.role === "counselor") {
    if (recipient.role !== "student") {
      return NextResponse.json(
        { error: "Counselors can only message students." },
        { status: 403 },
      );
    }
    const { data: counselor } = await supabase
      .from("counselors")
      .select("id")
      .eq("user_id", user.id)
      .single();
    if (!counselor) {
      return NextResponse.json({ error: "Counselor profile missing" }, { status: 403 });
    }
    const { count } = await supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("counselor_id", counselor.id)
      .eq("student_id", recipient.id);
    if (!count || count === 0) {
      return NextResponse.json(
        { error: "You can only message students you have/had an appointment with." },
        { status: 403 },
      );
    }
  } else {
    return NextResponse.json({ error: "Unknown role" }, { status: 403 });
  }

  const { data: inserted, error: insertError } = await supabase
    .from("messages")
    .insert({
      sender_id: user.id,
      recipient_id: recipient.id,
      subject: payload.subject.trim(),
      body: payload.body.trim(),
      parent_message_id: payload.parentMessageId ?? null,
    })
    .select("id, subject, body")
    .single();

  if (insertError || !inserted) {
    return NextResponse.json(
      { error: insertError?.message ?? "Could not send message." },
      { status: 500 },
    );
  }

  const origin = req.headers.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "";
  const threadUrl = `${origin}/${recipient.role}/messages`;
  await sendNewMessageNotice({
    recipientEmail: recipient.email,
    recipientName: recipient.name,
    senderName: sender.name,
    subject: inserted.subject,
    preview: inserted.body.slice(0, 200),
    threadUrl,
  });

  return NextResponse.json({ id: inserted.id });
}
