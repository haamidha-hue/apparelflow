import { NextResponse } from "next/server";
import { requireRole } from "@/lib/rbac";
import { getVerifiedQueue } from "@/lib/sewing-queue";
import { handleRouteError } from "@/lib/http-error";

// This endpoint takes no query parameters on purpose:
// there is nothing in the URL that could widen the result.
export async function GET() {
  const guard = await requireRole(["sewing_supervisor"]);
  if (!guard.ok) return guard.response;

  try {
    const orders = await getVerifiedQueue();
    return NextResponse.json({ orders });
  } catch (err) {
    return handleRouteError(err, "Sewing queue");
  }
}