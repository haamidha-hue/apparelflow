import type { NextResponse } from "next/server";
import type { Role } from "@prisma/client";
import { getSession, type Session } from "@/lib/auth";
import { jsonError } from "@/lib/api-response";

type GuardResult =
  | { ok: true; session: Session }
  | { ok: false; response: NextResponse };

/**
 * Call this at the top of every protected API route.
 *  - not logged in        -> 401 Unauthorized
 *  - logged in, wrong role -> 403 Forbidden
 * The role comes from the signed cookie, never from the request body.
 */
export async function requireRole(allowed: Role[]): Promise<GuardResult> {
  const session = await getSession();

  if (!session) {
    return { ok: false, response: jsonError(401, "Not authenticated") };
  }
  if (!allowed.includes(session.role)) {
    return {
      ok: false,
      response: jsonError(403, "Forbidden: your role cannot perform this action"),
    };
  }
  return { ok: true, session };
}