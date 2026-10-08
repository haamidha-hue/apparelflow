import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { submitCountsSchema } from "@/lib/validation";
import { jsonError, validationError } from "@/lib/api-response";
import { getItemStatus } from "@/lib/domain";
import { HttpError, handleRouteError } from "@/lib/http-error";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // 1. Only the verifier (401 / 403)
  const guard = await requireRole(["cutting_verifier"]);
  if (!guard.ok) return guard.response;

  const { id } = await params;

  // 2. Validate the body (400)
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "Invalid JSON body");
  }
  const parsed = submitCountsSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);
  const { counts } = parsed.data;

  const ids = counts.map((c) => c.componentId);
  if (new Set(ids).size !== ids.length) {
    return jsonError(400, "Duplicate component in counts");
  }

  // 3. Save. The traffic-light status is computed HERE, never taken from the client.
  try {
    await prisma.$transaction(
      async (tx) => {
        const order = await tx.cuttingOrder.findUnique({
          where: { id },
          include: { items: true },
        });
        if (!order) throw new HttpError(404, "Order not found");
        if (order.status !== "PENDING_VERIFICATION") {
          throw new HttpError(
            409,
            `Order is ${order.status}; counts can only be entered while pending verification`
          );
        }

        const byComponent = new Map(order.items.map((i) => [i.componentId, i]));
        for (const c of counts) {
          const item = byComponent.get(c.componentId);
          if (!item) {
            throw new HttpError(422, "Count refers to a component that is not part of this order");
          }
          await tx.verificationItem.update({
            where: { id: item.id },
            data: {
              actualQty: c.actualQty,
              status: getItemStatus(item.expectedQty, c.actualQty),
            },
          });
        }
      },
      { maxWait: 10000, timeout: 15000 }
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleRouteError(err, "Save counts");
  }
}