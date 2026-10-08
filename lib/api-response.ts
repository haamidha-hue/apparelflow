import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function jsonError(status: number, message: string, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status });
}

/** 400 response listing which field failed and why. */
export function validationError(err: ZodError) {
  return jsonError(400, "Validation failed", err.flatten().fieldErrors);
}