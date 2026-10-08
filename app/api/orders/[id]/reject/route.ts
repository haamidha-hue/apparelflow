import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { rejectSchema } from "@/lib/validation";
import { jsonError, validationError } from "@/lib/api-response";
import { computeWastagePct } from "@/lib/domain";
import { handleRouteError } from "@/lib/http-error";
import { throwNotPending } from "@/lib/order-guards";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireRole(["cutting_verifier"]);
  if (!guard.ok) return guard.response;

  const verifierId = guard.session.userId;
  const { id } = await params;

  // The reason note is mandatory (400 if missing or too short).
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "Invalid JSON body");
  }
  const parsed = rejectSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);
  const note = parsed.data.note;

  try {
    await prisma.$transaction(
      async (tx) => {
        const moved = await tx.cuttingOrder.updateMany({
          where: { id, status: "PENDING_VERIFICATION" },
          data: { status: "REJECTED" },
        });
        if (moved.count === 0) await throwNotPending(tx, id);

        const order = await tx.cuttingOrder.findUniqueOrThrow({
          where: { id },
          include: { recipe: true },
        });
        await tx.verificationLog.create({
          data: {
            orderId: id,
            verifierId,
            decision: "REJECTED",
            rejectionNote: note,
            wastagePct: computeWastagePct(
              Number(order.recipe.stdFabricYards),
              order.targetQty,
              Number(order.actualFabricYds)
            ),
          },
        });
      },
      { maxWait: 10000, timeout: 15000 }
    );

    return NextResponse.json({ ok: true, status: "REJECTED" });
  } catch (err) {
    return handleRouteError(err, "Reject");
  }
}