import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { ROLE_CONFIG } from "@/lib/roles";

async function RoleRedirect(): Promise<null> {
  const session = await getSession();
  redirect(session ? ROLE_CONFIG[session.role].home : "/login");
}

export default function Home() {
  return (
    <Suspense fallback={null}>
      <RoleRedirect />
    </Suspense>
  );
}