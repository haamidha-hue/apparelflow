import { PrismaClient } from "@prisma/client";

// In development, Next.js reloads code often and would create many database
// connections. We keep one client on globalThis and reuse it.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}