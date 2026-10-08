import type { OrderStatus } from "@prisma/client";

export type RecipeOption = {
  id: string;
  recipeCode: string;
  name: string;
  stdFabricYards: number;
  wastageCap: number;
  components: { id: string; componentName: string; piecesPerGarment: number }[];
};

export type OrderRow = {
  id: string;
  orderNo: string;
  recipeName: string;
  recipeCode: string;
  targetQty: number;
  fabricRollId: string;
  actualFabricYds: number;
  status: OrderStatus;
  createdAtLabel: string;
  rejectionNote: string | null;
};