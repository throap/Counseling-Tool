import { Resend } from "resend";
import { formatDisplayDate, formatDisplayTime } from "./slots";

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

function fromAddress(): string {
  return process.env.RESEND_FROM_EMAIL || "Counseling <onboarding@resend.dev>";
}

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

interface BookingPayload {
  studentEmail: string;
  studentName: string;
  counselorEmail: string;
  counselorName: string;
  appointmentId: string;
  date: string;
  startTime: string;
  reason: string | null;
}

export async function sendBookingConfirmation(p: BookingPayload): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping booking confirmation");
    return;
  }

  const when = `${formatDisplayDate(p.date)} at ${formatDisplayTime(p.startTime)}`;
  const cancelLink = `${appUrl()}/student/appointments?cancel=${p.appointmentId}`;

  try {
    await resend.emails.send({
      from: fromAddress(),
      to: p.studentEmail,
      subject: `Appointment confirmed with ${p.counselorName}`,
      html: `
        <h2>Your appointment is confirmed</h2>
        <p>Hi ${escapeHtml(p.studentName)},</p>
        <p>You're booked with <strong>${escapeHtml(p.counselorName)}</strong>.</p>
        <p><strong>When:</strong> ${when}</p>
        ${p.reason ? `<p><strong>Reason:</strong> ${escapeHtml(p.reason)}</p>` : ""}
        <p>Need to cancel? <a href="${cancelLink}">Manage your appointments</a>.</p>
      `,
    });

    await resend.emails.send({
      from: fromAddress(),
      to: p.counselorEmail,
      subject: `New appointment: ${p.studentName} on ${formatDisplayDate(p.date)}`,
      html: `
        <h2>New appointment booked</h2>
        <p><strong>Student:</strong> ${escapeHtml(p.studentName)} (${escapeHtml(p.studentEmail)})</p>
        <p><strong>When:</strong> ${when}</p>
        ${p.reason ? `<p><strong>Reason:</strong> ${escapeHtml(p.reason)}</p>` : ""}
      `,
    });
  } catch (err) {
    console.error("[email] booking confirmation failed", err);
  }
}

interface CancellationPayload {
  studentEmail: string;
  studentName: string;
  counselorEmail: string;
  counselorName: string;
  date: string;
  startTime: string;
  cancelledBy: "student" | "counselor";
  reason: string;
  urgent: boolean;
}

export async function sendCancellationNotice(p: CancellationPayload): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping cancellation notice");
    return;
  }

  const when = `${formatDisplayDate(p.date)} at ${formatDisplayTime(p.startTime)}`;
  const urgentPrefix = p.urgent ? "[URGENT] " : "";
  const cancellerName = p.cancelledBy === "student" ? p.studentName : p.counselorName;

  try {
    await Promise.all([
      resend.emails.send({
        from: fromAddress(),
        to: p.studentEmail,
        subject: `${urgentPrefix}Appointment cancelled`,
        html: `
          <h2>${p.urgent ? "Appointment cancelled — short notice" : "Appointment cancelled"}</h2>
          <p>Your appointment with <strong>${escapeHtml(p.counselorName)}</strong> on ${when} has been cancelled${p.cancelledBy === "counselor" ? " by your counselor" : ""}.</p>
          <p><strong>Reason:</strong> ${escapeHtml(p.reason)}</p>
          <p>You can book a new time anytime from your <a href="${appUrl()}/student/dashboard">dashboard</a>.</p>
        `,
      }),
      resend.emails.send({
        from: fromAddress(),
        to: p.counselorEmail,
        subject: `${urgentPrefix}Cancelled: ${p.studentName} on ${formatDisplayDate(p.date)}`,
        html: `
          <h2>${p.urgent ? "Appointment cancelled — short notice" : "Appointment cancelled"}</h2>
          <p><strong>${escapeHtml(cancellerName)}</strong> cancelled the appointment on ${when}.</p>
          <p><strong>Reason:</strong> ${escapeHtml(p.reason)}</p>
        `,
      }),
    ]);
  } catch (err) {
    console.error("[email] cancellation notice failed", err);
  }
}

interface NewMessagePayload {
  recipientEmail: string;
  recipientName: string;
  senderName: string;
  subject: string;
  preview: string;
  threadUrl: string;
}

export async function sendNewMessageNotice(p: NewMessagePayload): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping message notice");
    return;
  }
  try {
    await resend.emails.send({
      from: fromAddress(),
      to: p.recipientEmail,
      subject: `New message from ${p.senderName}: ${p.subject}`,
      html: `
        <h2>You have a new message</h2>
        <p>Hi ${escapeHtml(p.recipientName)},</p>
        <p><strong>${escapeHtml(p.senderName)}</strong> sent you a message:</p>
        <blockquote style="margin: 12px 0; padding: 8px 12px; border-left: 3px solid #7A9E7E; color: #555;">
          <strong>${escapeHtml(p.subject)}</strong><br/>
          ${escapeHtml(p.preview)}
        </blockquote>
        <p><a href="${p.threadUrl}">Open the conversation</a></p>
      `,
    });
  } catch (err) {
    console.error("[email] message notice failed", err);
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
