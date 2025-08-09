import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { verifySession } from "@/lib/auth"
import { getRecentAnalyses } from "@/lib/db"
import { ReportCard } from "@/components/report-card"

export default async function ReportsPage() {
  const cookieStore = await cookies()
  const session = cookieStore.get("session")?.value
  const valid = await verifySession(session || "")
  if (!valid) redirect("/login")

  const analyses = await getRecentAnalyses(100)

  return (
    <main className="container mx-auto p-4 md:p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold">Звіти аналізів</h1>
      </header>
      <div className="grid gap-4">
        {analyses.map((a) => (
          <ReportCard key={a.id} report={a as any} />
        ))}
      </div>
    </main>
  )
}
