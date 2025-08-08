import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { verifySession } from "@/lib/auth"

export default async function Page() {
  const cookieStore = await cookies()
  const session = cookieStore.get("session")?.value
  const valid = await verifySession(session || "")
  if (!valid) {
    redirect("/login")
  }
  redirect("/dashboard")
}
