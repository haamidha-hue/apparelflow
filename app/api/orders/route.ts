import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { createOrderSchema } from "@/lib/validation";
import { jsonError, validationError } from "@/lib/api-response";
import { computeExpectedQty } from "@/lib/domain";
import { generateOrderNo } from "@/lib/order-no";

export async function POST(req: Request) {
  // 1. Role check first (401 / 403)
  const guard = await requireRole(["cutting_supervisor"]);
  if (!guard.ok) return guard.response;

  // 2. Parse and validate the body (400)
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "Invalid JSON body");
  }
  const parsed = createOrderSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);
  const { recipeId, targetQty, fabricRollId, actualFabricYds } = parsed.data;

  // 3. The recipe must exist and have components
  const recipe = await prisma.recipe.findUnique({
    where: { id: recipeId },
    include: { components: true },
  });
  if (!recipe) return jsonError(404, "Recipe not found");
  if (recipe.components.length === 0) {
    return jsonError(422, "Recipe has no components");
  }

  // 4. Save the order and one verification row per component.
  // Status, creator and expected counts are decided HERE, not by the client.
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const order = await prisma.cuttingOrder.create({
        data: {
          orderNo: generateOrderNo(),
          recipeId,
          targetQty,
          fabricRollId,
          actualFabricYds,
          status: "CUTTING_IN_PROGRESS",
          createdBy: guard.session.userId,
          items: {
            create: recipe.components.map((c) => ({
              componentId: c.id,
              expectedQty: computeExpectedQty(c.piecesPerGarment, targetQty),
            })),
          },
        },
        select: { id: true, orderNo: true, status: true },
      });
      return NextResponse.json({ order }, { status: 201 });
    } catch (err) {
      // P2002 = duplicate order number. Try again with a new random number.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        continue;
      }
      console.error("Create order failed:", err);
      return jsonError(500, "Could not create order");
    }
  }
  return jsonError(500, "Could not generate a unique order number");
}