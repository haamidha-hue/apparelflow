import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { Role } from "@prisma/client";

export const COOKIE_NAME = "af_session";
export const MAX_AGE_SECONDS = 60 * 60 * 8; // 8 hours (one factory shift)

export type Session = {
  userId: string;
  email: string;
  fullName: string;
  role: Role;
};

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be set and at least 32 characters long");
  }
  return new TextEncoder().encode(secret);
}

/** Create a signed token for a logged-in user. */
export async function signSession(session: Session): Promise<string> {
  return new SignJWT({
    email: session.email,
    fullName: session.fullName,
    role: session.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(session.userId)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(getSecret());
}

/**
 * Read the cookie and return the logged-in user, or null.
 * Every protected API route will call this. Identity always comes from here,
 * never from the request body.
 */
export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      algorithms: ["HS256"],
    });
    if (!payload.sub) return null;
    return {
      userId: payload.sub,
      email: payload.email as string,
      fullName: payload.fullName as string,
      role: payload.role as Role,
    };
  } catch {
    // Expired, tampered or malformed token
    return null;
  }
}