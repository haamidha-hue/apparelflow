"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const DEMO_PASSWORD = "Password123!";

const DEMO_ACCOUNTS = [
  { label: "Cutting Supervisor", email: "cutting.supervisor@apparelflow.com" },
  { label: "Cutting Verifier", email: "cutting.verifier@apparelflow.com" },
  { label: "Sewing Supervisor", email: "sewing.supervisor@apparelflow.com" },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [loading, setLoading] = useState(false);

  function validate() {
    const e: typeof errors = {};
    if (!email.trim()) e.email = "Email is required";
    if (!password) e.password = "Password is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setErrors({});
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrors({ form: data.error ?? "Login failed" });
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setErrors({ form: "Network error. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  function fillDemo(demoEmail: string) {
    setEmail(demoEmail);
    setPassword(DEMO_PASSWORD);
    setErrors({});
  }

  const inputClass =
    "mt-1 block w-full rounded-md border border-gray-400 bg-white px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700";

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="rounded-lg bg-white p-6 shadow">
          <h1 className="text-2xl font-bold text-gray-900">ApparelFlow ERP</h1>
          <p className="mt-1 text-sm text-gray-700">Cutting Operations Terminal. Sign in to continue.</p>

          <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-900">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                placeholder="you@apparelflow.com"
              />
              {errors.email && <p className="mt-1 text-sm text-red-700">{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-900">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
              />
              {errors.password && <p className="mt-1 text-sm text-red-700">{errors.password}</p>}
            </div>

            {errors.form && (
              <p role="alert" className="rounded-md bg-red-100 p-2 text-sm text-red-800">
                {errors.form}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>

        <div className="rounded-lg border border-gray-300 bg-white p-4">
          <h2 className="text-sm font-semibold text-gray-900">Demo accounts (evaluator panel)</h2>
          <p className="mt-1 text-xs text-gray-700">
            Click a role to fill the form. Password for all: <code className="font-mono">{DEMO_PASSWORD}</code>
          </p>
          <div className="mt-3 space-y-2">
            {DEMO_ACCOUNTS.map((a) => (
              <button
                key={a.email}
                type="button"
                onClick={() => fillDemo(a.email)}
                className="flex w-full items-center justify-between rounded-md border border-gray-300 px-3 py-2 text-left text-sm text-gray-900 hover:bg-gray-100"
              >
                <span className="font-medium">{a.label}</span>
                <span className="text-xs text-gray-700">{a.email}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}