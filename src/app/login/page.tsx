import Link from "next/link";
import { Suspense } from "react";
import { Card } from "@/components/ui/Card";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <Card padding="lg" className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="font-serif text-3xl text-sage-dark">CounselConnect</h1>
          <p className="mt-2 text-sm text-ink-muted">Your support, scheduled.</p>
        </div>
        <Suspense fallback={<div className="text-center text-sm text-ink-subtle">Loading…</div>}>
          <LoginForm />
        </Suspense>
        <div className="mt-6 space-y-2 text-center text-sm text-ink-muted">
          <p>
            New student?{" "}
            <Link href="/signup" className="font-medium text-sage-dark hover:underline">
              Create your account →
            </Link>
          </p>
          <p>
            Counselor with an invite code?{" "}
            <Link href="/register/counselor" className="font-medium text-seablue-dark hover:underline">
              Register here →
            </Link>
          </p>
        </div>
      </Card>
    </main>
  );
}
