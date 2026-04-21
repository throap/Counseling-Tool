"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function CounselorRegisterPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!fullName.trim() || !email.trim() || !password || !inviteCode.trim()) {
      setError("All fields are required.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setPending(true);
    const res = await fetch("/api/register/counselor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        inviteCode: inviteCode.trim(),
      }),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      setPending(false);
      setError(payload.error ?? "Could not complete registration.");
      return;
    }

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setPending(false);
    if (signInError) {
      setError("Account created, but automatic sign-in failed. Please log in manually.");
      return;
    }
    router.push("/counselor/dashboard");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <Card padding="lg" className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="font-serif text-3xl text-sage-dark">Counselor registration</h1>
          <p className="mt-2 text-sm text-ink-muted">
            Enter the invite code you received from your administrator.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Input
            label="Full name"
            required
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
          <Input
            label="Email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            label="Password"
            type="password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Input
            label="Confirm password"
            type="password"
            required
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          <Input
            label="Invite code"
            required
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            helperText="Provided by your department administrator."
          />

          {error && (
            <div
              role="alert"
              className="rounded-md bg-danger-light px-4 py-2.5 text-sm text-[color:var(--color-danger)]"
            >
              {error}
            </div>
          )}

          <Button type="submit" disabled={pending} fullWidth>
            {pending ? "Creating account…" : "Create account"}
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-ink-muted">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-sage-dark hover:underline">
            Log in →
          </Link>
        </p>
      </Card>
    </main>
  );
}
