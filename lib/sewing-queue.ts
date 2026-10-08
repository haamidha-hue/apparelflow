import { prisma } from "@/lib/prisma";
import { formatFactoryTime } from "@/lib/format";
import { getItemStatus } from "@/lib/domain";
import type { SewingOrder } from "@/components/sewing/types";

// The status filter is part of the database query, so no other
// status can ever be returned, whatever the caller or the URL says.
async function loadByStatus(status: "VERIFIED" | "SEWING_STARTED"): Promise<SewingOrder[]> {
  const orders = await prisma.cuttingOrder.findMany({
    where: { status },
    orderBy: { updatedAt: "asc" },
    take: 100,
    include: {
      recipe: true,
      items: { orderBy: { componentId: "asc" }, include: { component: true } },
      // The immutable audit record written at approval time
      verification: {
        where: { decision: "APPROVED" },
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { verifier: true },
      },
    },
  });

  return orders.map((o) => {
    const log = o.verification[0];
    return {
      id: o.id,
      orderNo: o.orderNo,
      recipeName: o.recipe.name,
      recipeCode: o.recipe.recipeCode,
      targetQty: o.targetQty,
      fabricRollId: o.fabricRollId,
      actualFabricYds: Number(o.actualFabricYds),
      expectedFabricYds: Number((Number(o.recipe.stdFabricYards) * o.targetQty).toFixed(2)),
      wastagePct: log ? Number(log.wastagePct) : 0,
      wastageCap: Number(o.recipe.wastageCap),
      verifiedBy: log?.verifier.fullName ?? "Unknown",
      verifiedAtLabel: log ? formatFactoryTime(log.createdAt) : "-",
      items: o.items.map((i) => {
        const actual = i.actualQty ?? 0;
        return {
          id: i.id,
          componentName: i.component.componentName,
          expectedQty: i.expectedQty,
          actualQty: actual,
          status: getItemStatus(i.expectedQty, actual),
        };
      }),
    };
  });
}

/** The Sewing Queue: ONLY verified orders. */
export function getVerifiedQueue() {
  return loadByStatus("VERIFIED");
}

/** Orders the sewing floor has already started (read-only list). */
export function getStartedOrders() {
  return loadByStatus("SEWING_STARTED");
}