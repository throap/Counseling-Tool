"use client";

import { useMemo, useState, useTransition } from "react";
import { Card } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { generateInviteCode } from "./actions";

interface CodeItem {
  id: string;
  code: string;
  createdAt: string;
  expiresAt: string | null;
  usedBy: string | null;
  usedEmail: string | null;
}

const EXPIRY_OPTIONS: { label: string; hours: number }[] = [
  { label: "24 hours", hours: 24 },
  { label: "3 days", hours: 24 * 3 },
  { label: "7 days", hours: 24 * 7 },
  { label: "30 days", hours: 24 * 30 },
];

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/I/1 to avoid confusion

function randomCode(): string {
  let out = "INVITE-";
  for (let i = 0; i < 6; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function statusFor(c: CodeItem): { label: string; tone: "success" | "warning" | "blue" } {
  if (c.usedBy) return { label: "Used", tone: "success" };
  if (c.expiresAt && new Date(c.expiresAt) < new Date()) return { label: "Expired", tone: "warning" };
  return { label: "Active", tone: "blue" };
}

export default function InviteCodeManager({ codes }: { codes: CodeItem[] }) {
  const [code, setCode] = useState(() => randomCode());
  const [expiryHours, setExpiryHours] = useState(EXPIRY_OPTIONS[2].hours);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const sortedCodes = useMemo(
    () =>
      [...codes].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [codes],
  );

  function onGenerate(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000).toISOString();
    const nextCode = code.trim();
    startTransition(async () => {
      const res = await generateInviteCode(nextCode, expiresAt);
      if (res.error) {
        setMessage({ kind: "error", text: res.error });
        return;
      }
      setMessage({ kind: "success", text: `Created ${nextCode}. Share it with your counselor.` });
      setCode(randomCode());
    });
  }

  return (
    <div className="space-y-8">
      <Card padding="lg">
        <h2 className="mb-4 font-serif text-xl text-ink">Generate a code</h2>
        <form onSubmit={onGenerate} className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_200px_auto] sm:items-end">
          <Input
            label="Invite code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            helperText="Pre-filled suggestion — edit if you want a custom code."
          />
          <Select
            label="Expires in"
            value={expiryHours}
            onChange={(e) => setExpiryHours(Number(e.target.value))}
          >
            {EXPIRY_OPTIONS.map((o) => (
              <option key={o.hours} value={o.hours}>
                {o.label}
              </option>
            ))}
          </Select>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Generating…" : "Generate"}
          </Button>
        </form>
        {message && (
          <div
            role={message.kind === "error" ? "alert" : "status"}
            className={`mt-3 rounded-md px-4 py-2.5 text-sm ${
              message.kind === "error"
                ? "bg-danger-light text-[color:var(--color-danger)]"
                : "bg-sage-light text-sage-dark"
            }`}
          >
            {message.text}
          </div>
        )}
      </Card>

      <div>
        <h2 className="mb-3 font-serif text-xl text-ink">Existing codes</h2>
        {sortedCodes.length === 0 ? (
          <Card>
            <p className="text-sm text-ink-muted">No codes have been generated yet.</p>
          </Card>
        ) : (
          <Card padding="none" className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-muted/60 text-left text-xs uppercase tracking-wide text-ink-subtle">
                  <tr>
                    <th className="px-4 py-2 font-medium">Code</th>
                    <th className="px-4 py-2 font-medium">Created</th>
                    <th className="px-4 py-2 font-medium">Expires</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                    <th className="px-4 py-2 font-medium">Used by</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {sortedCodes.map((c) => {
                    const status = statusFor(c);
                    return (
                      <tr key={c.id} className="hover:bg-surface-muted/40">
                        <td className="px-4 py-2 font-mono text-ink">{c.code}</td>
                        <td className="px-4 py-2 text-ink-muted">{formatDate(c.createdAt)}</td>
                        <td className="px-4 py-2 text-ink-muted">{formatDate(c.expiresAt)}</td>
                        <td className="px-4 py-2">
                          <Badge tone={status.tone}>{status.label}</Badge>
                        </td>
                        <td className="px-4 py-2 text-ink-muted">{c.usedEmail ?? "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
