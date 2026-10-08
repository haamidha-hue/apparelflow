import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { formatFactoryTime } from "@/lib/format";
import { computeWastagePct } from "@/lib/domain";
import VerifierTerminal from "./VerifierTerminal";
import type { VerifyOrder } from "./types";

export default async function VerifierWorkspace() {
  const session = await getSession();
  if (session?.role !== "cutting_verifier") redirect("/login");

  // Only orders waiting at the QC station, oldest first.
  const orders = await prisma.cuttingOrder.findMany({
    where: { status: "PENDING_VERIFICATION" },
    orderBy: { createdAt: "asc" },
    take: 50,
    include: {
      recipe: true,
      items: { orderBy: { componentId: "asc" }, include: { component: true } },
    },
  });

  const rows: VerifyOrder[] = orders.map((o) => {
    const std = Number(o.recipe.stdFabricYards);
    const used = Number(o.actualFabricYds);
    return {
      id: o.id,
      orderNo: o.orderNo,
      recipeName: o.recipe.name,
      recipeCode: o.recipe.recipeCode,
      targetQty: o.targetQty,
      fabricRollId: o.fabricRollId,
      actualFabricYds: used,
      expectedFabricYds: Number((std * o.targetQty).toFixed(2)),
      wastagePct: computeWastagePct(std, o.targetQty, used),
      wastageCap: Number(o.recipe.wastageCap),
      createdAtLabel: formatFactoryTime(o.createdAt),
      items: o.items.map((i) => ({
        id: i.id,
        componentId: i.componentId,
        componentName: i.component.componentName,
        piecesPerGarment: i.component.piecesPerGarment,
        expectedQty: i.expectedQty,
        actualQty: i.actualQty,
      })),
    };
  });

  return <VerifierTerminal orders={rows} />;
}