import type { Prisma } from "@prisma/client";
import { HttpError } from "@/lib/http-error";

// Call this when an atomic status change matched 0 rows,
// to explain why: the order doesn't exist (404) or is in the wrong state (409).
export async function throwNotPending(
  tx: Prisma.TransactionClient,
  id: string
): Promise<never> {
  const existing = await tx.cuttingOrder.findUnique({
    where: { id },
    select: { status: true },
  });
  if (!existing) throw new HttpError(404, "Order not found");
  throw new HttpError(
    409,
    `Order is ${existing.status}; only PENDING_VERIFICATION orders can be decided`
  );
}