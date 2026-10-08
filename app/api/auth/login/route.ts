import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validation";
import { jsonError, validationError } from "@/lib/api-response";
import { COOKIE_NAME, MAX_AGE_SECONDS, signSession } from "@/lib/auth";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "Invalid JSON body");
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  // Same message for "no such user" and "wrong password",
  // so attackers can't discover which emails exist.
  const passwordOk = user ? await bcrypt.compare(password, user.passwordHash) : false;
  if (!user || !passwordOk) {
    return jsonError(401, "Invalid email or password");
  }

  const token = await signSession({
    userId: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
  });

  const res = NextResponse.json({
    user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role },
  });

  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true, // JavaScript cannot read it
    sameSite: "lax", // basic CSRF protection
    secure: process.env.NODE_ENV === "production", // HTTPS only when deployed
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });

  return res;
}
