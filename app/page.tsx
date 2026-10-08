import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

async function Redirector(): Promise<null> {
  const session = await getSession();
  redirect(session ? "/dashboard" : "/login");
}

export default function Home() {
  return (
    <Suspense fallback={null}>
      <Redirector />
    </Suspense>
  );
}