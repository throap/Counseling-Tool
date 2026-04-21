"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

type Tab = "student" | "counselor";

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");

  const [tab, setTab] = useState<Tab>("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [studentId, setStudentId] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (authError || !data.user) {
      setPending(false);
      setError(authError?.message ?? "Sign-in failed");
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("role, student_id")
      .eq("id", data.user.id)
      .single();

    if (profileError || !profile) {
      await supabase.auth.signOut();
      setPending(false);
      setError("No profile found for this account. Contact your administrator.");
      return;
    }

    if (profile.role !== tab) {
      await supabase.auth.signOut();
      setPending(false);
      setError(`This account is registered as a ${profile.role}. Switch the tab above and try again.`);
      return;
    }

    if (tab === "student") {
      const expected = studentId.trim();
      if (!expected) {
        await supabase.auth.signOut();
        setPending(false);
        setError("Student ID is required.");
        return;
      }
      if (profile.student_id !== expected) {
        await supabase.auth.signOut();
        setPending(false);
        setError("Student ID does not match our records.");
        return;
      }
    }

    const dest = next || (profile.role === "counselor" ? "/counselor/dashboard" : "/student/dashboard");
    router.push(dest);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-1 rounded-md bg-surface-muted p-1 text-sm">
        {(["student", "counselor"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-md py-2 font-medium capitalize transition-all ease-smooth ${
              tab === t
                ? "bg-surface text-sage-dark shadow-soft"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

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
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      {tab === "student" && (
        <Input
          label="Student ID"
          type="text"
          required
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
        />
      )}

      {error && (
        <div
          role="alert"
          className="rounded-md bg-danger-light px-4 py-2.5 text-sm text-[color:var(--color-danger)]"
        >
          {error}
        </div>
      )}

      <Button type="submit" disabled={pending} fullWidth>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
