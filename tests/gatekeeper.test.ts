import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getItemStatus } from "@/lib/domain";
import { getVerifiedQueue } from "@/lib/sewing-queue";
import { POST as approve } from "@/app/api/orders/[id]/approve/route";
import { POST as reject } from "@/app/api/orders/[id]/reject/route";

// ---- Fake login: tests choose who is "logged in" ----
type FakeSession = { userId: string; email: string; fullName: string; role: Role } | null;
const auth = vi.hoisted(() => ({ current: null as FakeSession }));
vi.mock("@/lib/auth", () => ({ getSession: async () => auth.current }));

// ---- Test data helpers ----
const users = {} as Record<Role, { id: string; email: string; fullName: string }>;
let recipe: Awaited<ReturnType<typeof loadRecipe>>;
const createdOrderIds: string[] = [];
let counter = 0;

const TARGET_QTY = 10;

function loginAs(role: Role | null) {
  auth.current = role
    ? { userId: users[role].id, email: users[role].email, fullName: users[role].fullName, role }
    : null;
}

async function loadRecipe() {
  return prisma.recipe.findUniqueOrThrow({
    where: { recipeCode: "REC-BL01" },
    include: { components: { orderBy: { id: "asc" } } },
  });
}

/**
 * Creates a test order directly in the database.
 * `adjust[i]` is added to the expected count of component i
 * (0 = exact match, -1 = shortage of 1, +2 = excess of 2, null = not counted).
 */
async function makeOrder(
  status: "PENDING_VERIFICATION" | "REJECTED" | "VERIFIED",
  adjust: (number | null)[] = recipe.components.map(() => 0)
) {
  counter += 1;
  const order = await prisma.cuttingOrder.create({
    data: {
      orderNo: `TEST-${Date.now()}-${counter}`,
      recipeId: recipe.id,
      targetQty: TARGET_QTY,
      fabricRollId: "TEST-ROLL",
      actualFabricYds: 19.8, // expected 1.8 x 10 = 18 yds, so wastage = 10%
      status,
      createdBy: users.cutting_supervisor.id,
      items: {
        create: recipe.components.map((c, i) => {
          const expectedQty = c.piecesPerGarment * TARGET_QTY;
          const adj = adjust[i];
          const actualQty = adj === null ? null : expectedQty + adj;
          return {
            componentId: c.id,
            expectedQty,
            actualQty,
            status: actualQty === null ? null : getItemStatus(expectedQty, actualQty),
          };
        }),
      },
    },
  });
  createdOrderIds.push(order.id);
  return order.id;
}

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const callApprove = (id: string) =>
  approve(new Request("http://localhost/api/approve", { method: "POST" }), ctx(id));
const callReject = (id: string, body: unknown) =>
  reject(
    new Request("http://localhost/api/reject", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    ctx(id)
  );
const statusOf = async (id: string) =>
  (await prisma.cuttingOrder.findUniqueOrThrow({ where: { id } })).status;

beforeAll(async () => {
  const all = await prisma.user.findMany();
  for (const u of all) users[u.role] = { id: u.id, email: u.email, fullName: u.fullName };
  recipe = await loadRecipe();
});

beforeEach(() => loginAs(null));

afterAll(async () => {
  // Remove only the data created by these tests.
  await prisma.verificationLog.deleteMany({ where: { orderId: { in: createdOrderIds } } });
  await prisma.cuttingOrder.deleteMany({ where: { id: { in: createdOrderIds } } });
  await prisma.$disconnect();
});

describe("Gatekeeper rules", () => {
  // Test 1
  it("approves an order with all GREEN components for an authenticated verifier", async () => {
    const id = await makeOrder("PENDING_VERIFICATION");
    loginAs("cutting_verifier");

    const res = await callApprove(id);
    expect(res.status).toBe(200);
    expect(await statusOf(id)).toBe("VERIFIED");

    // Audit trail: verifier comes from the session, wastage is computed by the server.
    const log = await prisma.verificationLog.findFirstOrThrow({ where: { orderId: id } });
    expect(log.decision).toBe("APPROVED");
    expect(log.verifierId).toBe(users.cutting_verifier.id);
    expect(Number(log.wastagePct)).toBe(10);
    expect(log.createdAt).toBeInstanceOf(Date);
  });

  // Test 2
  it("blocks approval (422) when any component is RED, and leaves the order pending", async () => {
    const adjust = recipe.components.map(() => 0);
    adjust[adjust.length - 1] = -1; // one component is short by 1
    const id = await makeOrder("PENDING_VERIFICATION", adjust);
    loginAs("cutting_verifier");

    const res = await callApprove(id);
    expect(res.status).toBe(422);
    expect((await res.json()).error).toMatch(/shortage/i);

    expect(await statusOf(id)).toBe("PENDING_VERIFICATION"); // rolled back
    expect(await prisma.verificationLog.count({ where: { orderId: id } })).toBe(0);
  });

  it("blocks approval (422) when a component has not been counted", async () => {
    const adjust: (number | null)[] = recipe.components.map(() => 0);
    adjust[0] = null; // first component never counted
    const id = await makeOrder("PENDING_VERIFICATION", adjust);
    loginAs("cutting_verifier");

    const res = await callApprove(id);
    expect(res.status).toBe(422);
    expect(await statusOf(id)).toBe("PENDING_VERIFICATION");
  });

  it("still allows approval when a component is YELLOW (excess)", async () => {
    const adjust = recipe.components.map(() => 0);
    adjust[0] = 2;
    const id = await makeOrder("PENDING_VERIFICATION", adjust);
    loginAs("cutting_verifier");

    expect((await callApprove(id)).status).toBe(200);
    expect(await statusOf(id)).toBe("VERIFIED");
  });

  // Test 3
  it("rejects a rejection with no reason note (400)", async () => {
    const id = await makeOrder("PENDING_VERIFICATION");
    loginAs("cutting_verifier");

    for (const body of [{}, { note: "" }, { note: "   " }, { note: "abc" }]) {
      const res = await callReject(id, body);
      expect(res.status).toBe(400);
    }
    expect(await statusOf(id)).toBe("PENDING_VERIFICATION");
  });

  it("accepts a rejection with a proper reason and records it", async () => {
    const id = await makeOrder("PENDING_VERIFICATION");
    loginAs("cutting_verifier");

    const res = await callReject(id, { note: "Cuffs have fabric defects" });
    expect(res.status).toBe(200);
    expect(await statusOf(id)).toBe("REJECTED");

    const log = await prisma.verificationLog.findFirstOrThrow({ where: { orderId: id } });
    expect(log.decision).toBe("REJECTED");
    expect(log.rejectionNote).toBe("Cuffs have fabric defects");
  });

  // Test 4
  it("returns 403 for non-verifier roles on approve and reject", async () => {
    const id = await makeOrder("PENDING_VERIFICATION");

    for (const role of ["cutting_supervisor", "sewing_supervisor"] as Role[]) {
      loginAs(role);
      expect((await callApprove(id)).status).toBe(403);
      expect((await callReject(id, { note: "Valid reason here" })).status).toBe(403);
    }
    expect(await statusOf(id)).toBe("PENDING_VERIFICATION");
  });

  it("returns 401 when nobody is logged in", async () => {
    const id = await makeOrder("PENDING_VERIFICATION");
    loginAs(null);
    expect((await callApprove(id)).status).toBe(401);
  });

  // Test 5
  it("never returns unapproved orders from the sewing queue query", async () => {
    const pendingId = await makeOrder("PENDING_VERIFICATION");
    const rejectedId = await makeOrder("REJECTED");
    const verifiedId = await makeOrder("VERIFIED");

    // The verified order needs an approval log, like a real approval would create.
    await prisma.verificationLog.create({
      data: {
        orderId: verifiedId,
        verifierId: users.cutting_verifier.id,
        decision: "APPROVED",
        wastagePct: 10,
      },
    });

    const queue = await getVerifiedQueue();
    const queueIds = queue.map((o) => o.id);

    expect(queueIds).toContain(verifiedId);
    expect(queueIds).not.toContain(pendingId);
    expect(queueIds).not.toContain(rejectedId);

    // Every order returned really is VERIFIED in the database.
    const rows = await prisma.cuttingOrder.findMany({ where: { id: { in: queueIds } } });
    expect(rows.every((r) => r.status === "VERIFIED")).toBe(true);
  });
});