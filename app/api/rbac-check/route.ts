import { NextResponse } from "next/server";
import { requireRole } from "@/lib/rbac";

// TEMPORARY: only the verifier may call this. Delete after testing.
export async function GET() {
  const guard = await requireRole(["cutting_verifier"]);
  if (!guard.ok) return guard.response;

  return NextResponse.json({
    ok: true,
    message: `Hello ${guard.session.fullName}, you are allowed.`,
  });
}