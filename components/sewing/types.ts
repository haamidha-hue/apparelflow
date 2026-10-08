import type { ItemStatus } from "@/lib/domain";

export type SewingItem = {
  id: string;
  componentName: string;
  expectedQty: number;
  actualQty: number;
  status: ItemStatus;
};

export type SewingOrder = {
  id: string;
  orderNo: string;
  recipeName: string;
  recipeCode: string;
  targetQty: number;
  fabricRollId: string;
  actualFabricYds: number;
  expectedFabricYds: number;
  wastagePct: number; // the value stored in the audit log at approval time
  wastageCap: number;
  verifiedBy: string;
  verifiedAtLabel: string;
  items: SewingItem[];
};