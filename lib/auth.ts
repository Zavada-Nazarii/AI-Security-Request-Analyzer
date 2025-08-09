import { cookies } from "next/headers"
import { SignJWT, jwtVerify } from "jose"
import { getSettings } from "./db"

const DEFAULT_SECRET = "change-me-in-settings"

export async function createSession(username: string) {
  const secret = (await getSettings()).session_secret || DEFAULT_SECRET
  const alg = "HS256"
  const token = await new SignJWT({ sub: username, t: "session" })
    .setProtectedHeader({ alg })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(new TextEncoder().encode(secret))
  const cookieStore = await cookies()
  cookieStore.set("session", token, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: false,
    maxAge: 60 * 60 * 24 * 7,
  })
}

export async function clearSession() {
  const cookieStore = await cookies()
  cookieStore.set("session", "", {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: false,
    maxAge: 0,
  })
}

export async function verifySession(token: string): Promise<boolean> {
  if (!token) return false
  try {
    const secret = (await getSettings()).session_secret || DEFAULT_SECRET
    await jwtVerify(token, new TextEncoder().encode(secret))
    return true
  } catch {
    return false
  }
}
