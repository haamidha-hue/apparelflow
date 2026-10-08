"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Role } from "@prisma/client";
import { DEMO_PASSWORD, ROLE_CONFIG } from "@/lib/roles";

export default function RoleSwitcher({ currentRole }: { currentRole: Role }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function switchTo(role: Role) {
    if (role === currentRole) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: ROLE_CONFIG[role].email,
          password: DEMO_PASSWORD,
        }),
      });
      if (!res.ok) {
        setError("Could not switch role");
        return;
      }
      router.push(ROLE_CONFIG[role].home);
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="role-switcher" className="text-sm font-medium text-gray-900">
        Switch role:
      </label>
      <select
        id="role-switcher"
        value={currentRole}
        disabled={busy}
        onChange={(e) => switchTo(e.target.value as Role)}
        className="rounded-md border border-gray-400 bg-white px-2 py-1 text-sm text-gray-900 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700 disabled:opacity-60"
      >
        {(Object.keys(ROLE_CONFIG) as Role[]).map((r) => (
          <option key={r} value={r} className="bg-white text-gray-900">
            {ROLE_CONFIG[r].label}
          </option>
        ))}
      </select>
      {error && <span className="text-sm text-red-700">{error}</span>}
    </div>
  );
}