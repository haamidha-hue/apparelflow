import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { formatFactoryTime } from "@/lib/format";
import CreateOrderModal from "./CreateOrderModal";
import OrderList from "./OrderList";
import type { OrderRow, RecipeOption } from "./types";

export default async function CuttingWorkspace() {
  // Guard right next to the database query (defense in depth)
  const session = await getSession();
  if (session?.role !== "cutting_supervisor") redirect("/login");

  const [recipes, orders] = await Promise.all([
    prisma.recipe.findMany({
      orderBy: { recipeCode: "asc" },
      include: { components: { orderBy: { id: "asc" } } },
    }),
    prisma.cuttingOrder.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        recipe: true,
        // newest verification log, so we can show the rejection note
        verification: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    }),
  ]);

  // Convert to plain objects (Decimal values cannot go to client components)
  const recipeOptions: RecipeOption[] = recipes.map((r) => ({
    id: r.id,
    recipeCode: r.recipeCode,
    name: r.name,
    stdFabricYards: Number(r.stdFabricYards),
    wastageCap: Number(r.wastageCap),
    components: r.components.map((c) => ({
      id: c.id,
      componentName: c.componentName,
      piecesPerGarment: c.piecesPerGarment,
    })),
  }));

  const rows: OrderRow[] = orders.map((o) => ({
    id: o.id,
    orderNo: o.orderNo,
    recipeName: o.recipe.name,
    recipeCode: o.recipe.recipeCode,
    targetQty: o.targetQty,
    fabricRollId: o.fabricRollId,
    actualFabricYds: Number(o.actualFabricYds),
    status: o.status,
    createdAtLabel: formatFactoryTime(o.createdAt),
    rejectionNote: o.status === "REJECTED" ? (o.verification[0]?.rejectionNote ?? null) : null,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-gray-900">Create cutting batches and send them to the QC verifier.</p>
        <CreateOrderModal recipes={recipeOptions} />
      </div>
      <OrderList orders={rows} />
    </div>
  );
}