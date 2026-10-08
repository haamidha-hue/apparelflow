import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { jsonError } from "@/lib/api-response";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireRole(["cutting_supervisor"]);
  if (!guard.ok) return guard.response;

  const { id } = await params;

  // The status check is INSIDE the update, so the transition is atomic:
  // only an order that is CUTTING_IN_PROGRESS or REJECTED can move forward.
  const moved = await prisma.$transaction(async (tx) => {
    const result = await tx.cuttingOrder.updateMany({
      where: { id, status: { in: ["CUTTING_IN_PROGRESS", "REJECTED"] } },
      data: { status: "PENDING_VERIFICATION" },
    });
    if (result.count === 0) return false;

    // Fresh count for the verifier (matters after a rejection and re-cut)
    await tx.verificationItem.updateMany({
      where: { orderId: id },
      data: { actualQty: null, status: null },
    });
    return true;
  });

  if (!moved) {
    const existing = await prisma.cuttingOrder.findUnique({
      where: { id },
      select: { status: true },
    });
    if (!existing) return jsonError(404, "Order not found");
    return jsonError(409, `Order cannot be submitted from status ${existing.status}`);
  }

  return NextResponse.json({ ok: true, status: "PENDING_VERIFICATION" });
}