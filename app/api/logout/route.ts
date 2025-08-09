import { NextResponse } from "next/server"
import { clearSession } from "@/lib/auth"

export async function POST() {
  await clearSession()
  return new NextResponse(null, { status: 200 })
}
