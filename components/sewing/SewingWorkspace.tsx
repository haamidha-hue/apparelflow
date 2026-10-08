import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getStartedOrders, getVerifiedQueue } from "@/lib/sewing-queue";
import SewingQueue from "./SewingQueue";

export default async function SewingWorkspace() {
  const session = await getSession();
  if (session?.role !== "sewing_supervisor") redirect("/login");

  const [queue, started] = await Promise.all([getVerifiedQueue(), getStartedOrders()]);
  return <SewingQueue queue={queue} started={started} />;
}