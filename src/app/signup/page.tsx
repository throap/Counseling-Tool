"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

const SCHOOLS = [
  "Adrienne C. Nelson High School",
  "Cascade High School",
  "David Douglas High School",
  "Centennial High School",
  "Reynolds High School",
  "Other",
];

const SVCTE_COURSES = [
  "Automotive Technology",
  "Barbering & Cosmetology",
  "Building Construction",
  "Business & Entrepreneurship",
  "Computer Science & Software Engineering",
  "Culinary Arts & Hospitality",
  "Early Childhood Education",
  "Electrical Technology",
  "Emergency Medical Technician (EMT)",
  "Graphic Design & Digital Media",
  "Health Sciences & Nursing",
  "HVAC & Plumbing",
  "Legal & Justice Studies",
  "Manufacturing & Welding",
  "Network & Cybersecurity",
  "Other",
];

interface Errors {
  firstName?: string;
  lastName?: string;
  schoolName?: string;
  svcteCourse?: string;
  email?: string;
  studentId?: string;
  password?: string;
  confirmPassword?: string;
  form?: string;
}

export default function SignUpPage() {
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [svcteCourse, setSvcteCourse] = useState("");
  const [email, setEmail] = useState("");
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [successName, setSuccessName] = useState<string | null>(null);

  function validate(): Errors {
    const e: Errors = {};
    if (!firstName.trim()) e.firstName = "First name is required.";
    if (!lastName.trim()) e.lastName = "Last name is required.";
    if (!schoolName) e.schoolName = "Please select your school.";
    if (!svcteCourse) e.svcteCourse = "Please select your SVCte course.";
    if (!email.trim()) e.email = "Email address is required.";
    if (!studentId.trim()) e.studentId = "Student ID is required.";
    if (!password) e.password = "Password is required.";
    else if (password.length < 8) e.password = "Password must be at least 8 characters.";
    if (!confirmPassword) e.confirmPassword = "Please confirm your password.";
    else if (password !== confirmPassword) e.confirmPassword = "Passwords do not match.";
    return e;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setPending(true);

    const res = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        schoolName,
        svcteCourse,
        email: email.trim(),
        studentId: studentId.trim(),
        password,
      }),
    });

    const payload = await res.json().catch(() => ({}));

    if (!res.ok) {
      setPending(false);
      setErrors({ form: payload.error ?? "Could not create account. Please try again." });
      return;
    }

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setPending(false);
      setErrors({
        form: "Account created, but we could not sign you in automatically. Please log in.",
      });
      return;
    }

    setSuccessName(firstName.trim());
    setTimeout(() => {
      router.push("/student/dashboard");
      router.refresh();
    }, 1800);
  }

  if (successName) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <Card padding="lg" className="w-full max-w-md text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-sage-light">
            <svg className="h-8 w-8 text-sage-dark" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="font-serif text-2xl text-ink">Welcome, {successName}!</h2>
          <p className="mt-2 text-ink-muted">Your account is ready. Redirecting you now…</p>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <Card padding="lg" className="w-full max-w-[560px]">
        <div className="mb-6 text-center">
          <h1 className="font-serif text-3xl text-sage-dark">CounselConnect</h1>
          <p className="mt-1 text-sm text-ink-muted">Create your student account</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="First Name"
              required
              autoComplete="given-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              error={errors.firstName}
            />
            <Input
              label="Last Name"
              required
              autoComplete="family-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              error={errors.lastName}
            />
          </div>

          <Select
            label="School Name"
            required
            value={schoolName}
            onChange={(e) => setSchoolName(e.target.value)}
            error={errors.schoolName}
            helperText="This helps match you with the right counselor"
          >
            <option value="">Select your school…</option>
            {SCHOOLS.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>

          <Select
            label="SVCte Course"
            required
            value={svcteCourse}
            onChange={(e) => setSvcteCourse(e.target.value)}
            error={errors.svcteCourse}
            helperText="This helps match you with the right counselor"
          >
            <option value="">Select your course…</option>
            {SVCTE_COURSES.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>

          <hr className="border-line" />

          <Input
            label="Email Address"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
          />

          <Input
            label="Student ID"
            required
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            error={errors.studentId}
          />

          <hr className="border-line" />

          <div className="relative">
            <Input
              label="Password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-[34px] text-xs font-medium text-ink-muted hover:text-ink"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          <div className="relative">
            <Input
              label="Confirm Password"
              type={showConfirmPassword ? "text" : "password"}
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={errors.confirmPassword}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((v) => !v)}
              className="absolute right-3 top-[34px] text-xs font-medium text-ink-muted hover:text-ink"
            >
              {showConfirmPassword ? "Hide" : "Show"}
            </button>
          </div>

          {errors.form && (
            <div role="alert" className="rounded-md bg-danger-light px-4 py-2.5 text-sm text-[color:var(--color-danger)]">
              {errors.form}
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
