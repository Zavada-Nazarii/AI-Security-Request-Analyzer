import { NextResponse } from "next/server"
import { getUser } from "@/lib/db"
import bcrypt from "bcryptjs"
import { createSession } from "@/lib/auth"

export async function POST(req: Request) {
  const form = await req.formData()
  const username = (form.get("username") as string) || ""
  const password = (form.get("password") as string) || ""
  const user = await getUser(username)
  if (!user) return new NextResponse("Невірні облікові дані", { status: 401 })
  const ok = await bcrypt.compare(password, user.password_hash).catch(() => false)
  if (!ok) return new NextResponse("Невірні облікові дані", { status: 401 })
  await createSession(username)
  return new NextResponse(null, { status: 200 })
}
