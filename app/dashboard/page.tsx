import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import LogoutButton from "@/components/LogoutButton";

// This part reads the cookie, so it lives inside <Suspense>.
async function DashboardContent() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="mx-auto max-w-3xl rounded-lg bg-white p-6 shadow">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
        <LogoutButton />
      </div>
      <p className="mt-4 text-gray-900">
        Welcome, <strong>{session.fullName}</strong>
      </p>
      <p className="text-gray-700">Role: {session.role}</p>
      <p className="text-gray-700">Email: {session.email}</p>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <Suspense fallback={<p className="text-gray-700">Loading...</p>}>
        <DashboardContent />
      </Suspense>
    </main>
  );
}