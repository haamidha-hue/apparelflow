export type ItemStatus = "GREEN" | "YELLOW" | "RED";

/** 50 garments x 2 cuffs = 100 cuffs expected. */
export function computeExpectedQty(
  piecesPerGarment: number,
  targetQty: number
): number {
  return piecesPerGarment * targetQty;
}

/** Traffic light for one component. */
export function getItemStatus(expectedQty: number, actualQty: number): ItemStatus {
  if (actualQty === expectedQty) return "GREEN";
  if (actualQty > expectedQty) return "YELLOW";
  return "RED";
}

/**
 * Fabric Wastage % = ((Actual - Expected) / Expected) x 100
 * Expected fabric = std yards per piece x batch quantity.
 * Rounded to 2 decimals.
 */
export function computeWastagePct(
  stdFabricYards: number,
  targetQty: number,
  actualFabricYds: number
): number {
  const expectedFabric = stdFabricYards * targetQty;
  if (expectedFabric <= 0) return 0;
  const pct = ((actualFabricYds - expectedFabric) / expectedFabric) * 100;
  return Math.round(pct * 100) / 100;
}

type CountedItem = { expectedQty: number; actualQty: number | null };

export type ApprovalCheck =
  | { ok: true }
  | { ok: false; reason: string };

/**
 * The hard-stop rule. Approval is allowed only if:
 *  - there is at least one component,
 *  - every component has been counted,
 *  - no component is short (RED).
 * It recomputes from the raw numbers, so it never trusts a stored status.
 */
export function checkApproval(items: CountedItem[]): ApprovalCheck {
  if (items.length === 0) {
    return { ok: false, reason: "Order has no components to verify." };
  }
  if (items.some((i) => i.actualQty === null)) {
    return { ok: false, reason: "Not all components have been counted." };
  }
  if (items.some((i) => (i.actualQty as number) < i.expectedQty)) {
    return { ok: false, reason: "Shortage detected. Batch cannot be approved." };
  }
  return { ok: true };
}