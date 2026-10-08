import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { HttpError, handleRouteError } from "@/lib/http-error";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireRole(["sewing_supervisor"]);
  if (!guard.ok) return guard.response;

  const { id } = await params;

  try {
    await prisma.$transaction(async (tx) => {
      // Atomic: only a VERIFIED order can start sewing.
      const moved = await tx.cuttingOrder.updateMany({
        where: { id, status: "VERIFIED" },
        data: { status: "SEWING_STARTED" },
      });
      if (moved.count === 0) {
        const existing = await tx.cuttingOrder.findUnique({
          where: { id },
          select: { status: true },
        });
        // Don't reveal that unverified orders exist: treat them as not found.
        if (!existing || existing.status !== "SEWING_STARTED") {
          throw new HttpError(404, "Order not found in the sewing queue");
        }
        throw new HttpError(409, "Sewing has already started for this order");
      }
    });

    return NextResponse.json({ ok: true, status: "SEWING_STARTED" });
  } catch (err) {
    return handleRouteError(err, "Start sewing");
  }
}