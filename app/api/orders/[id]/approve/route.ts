import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { checkApproval, computeWastagePct } from "@/lib/domain";
import { HttpError, handleRouteError } from "@/lib/http-error";
import { throwNotPending } from "@/lib/order-guards";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // 1. Only the verifier (401 / 403)
  const guard = await requireRole(["cutting_verifier"]);
  if (!guard.ok) return guard.response;

  // Identity comes from the signed cookie, never from the request body.
  const verifierId = guard.session.userId;
  const { id } = await params;

  try {
    const wastagePct = await prisma.$transaction(
      async (tx) => {
        // 2. Atomic state change: only PENDING_VERIFICATION -> VERIFIED.
        const moved = await tx.cuttingOrder.updateMany({
          where: { id, status: "PENDING_VERIFICATION" },
          data: { status: "VERIFIED" },
        });
        if (moved.count === 0) await throwNotPending(tx, id);

        // 3. HARD STOP: re-read the counts from the database and recompute.
        const order = await tx.cuttingOrder.findUniqueOrThrow({
          where: { id },
          include: { recipe: true, items: true },
        });
        const check = checkApproval(
          order.items.map((i) => ({
            expectedQty: i.expectedQty,
            actualQty: i.actualQty,
          }))
        );
        // Throwing rolls the whole transaction back.
        if (!check.ok) throw new HttpError(422, check.reason);

        // 4. Immutable audit record (append-only table).
        const pct = computeWastagePct(
          Number(order.recipe.stdFabricYards),
          order.targetQty,
          Number(order.actualFabricYds)
        );
        await tx.verificationLog.create({
          data: { orderId: id, verifierId, decision: "APPROVED", wastagePct: pct },
        });
        return pct;
      },
      { maxWait: 10000, timeout: 15000 }
    );

    return NextResponse.json({ ok: true, status: "VERIFIED", wastagePct });
  } catch (err) {
    return handleRouteError(err, "Approve");
  }
}