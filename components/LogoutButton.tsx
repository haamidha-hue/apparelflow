"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className="rounded-md border border-gray-400 bg-white px-3 py-1.5 text-sm font-medium text-gray-900 hover:bg-gray-100"
    >
      Log out
    </button>
  );
}