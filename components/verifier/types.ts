export type VerifyItem = {
  id: string;
  componentId: string;
  componentName: string;
  piecesPerGarment: number;
  expectedQty: number;
  actualQty: number | null; // null = not counted yet
};

export type VerifyOrder = {
  id: string;
  orderNo: string;
  recipeName: string;
  recipeCode: string;
  targetQty: number;
  fabricRollId: string;
  actualFabricYds: number;
  expectedFabricYds: number;
  wastagePct: number;
  wastageCap: number;
  createdAtLabel: string;
  items: VerifyItem[];
};