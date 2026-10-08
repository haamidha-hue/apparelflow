import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { jsonError } from "@/lib/api-response";

export async function GET() {
  const session = await getSession();
  if (!session) return jsonError(401, "Not authenticated");
  return NextResponse.json({ user: session });
}