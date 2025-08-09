import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { verifySession } from "@/lib/auth"
import { getRecentAnalyses } from "@/lib/db"
import { RequestAnalyzerForm } from "@/components/request-analyzer-form"
import { ReportCard } from "@/components/report-card"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default async function DashboardPage() {
  const cookieStore = await cookies()
  const session = cookieStore.get("session")?.value
  const valid = await verifySession(session || "")
  if (!valid) redirect("/login")

  let analyses: any[] = []
  try {
    analyses = await getRecentAnalyses(10)
  } catch (e) {
    console.error("Failed to load analyses:", e)
    analyses = []
  }

  return (
    <main className="container mx-auto p-4 md:p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold">AI Security Request Analyzer</h1>
        <div className="flex gap-2">
          <Link href="/settings">
            <Button variant="outline">Налаштування</Button>
          </Link>
          <form action="/api/logout" method="post">
            <Button variant="destructive">Вийти</Button>
          </form>
        </div>
      </header>

      <section className="grid lg:grid-cols-[1.1fr_0.9fr] gap-6">
        <RequestAnalyzerForm />
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Останні звіти</h2>
            <Link href="/reports">
              <Button variant="ghost">Всі звіти</Button>
            </Link>
          </div>
          <div className="grid gap-4">
            {analyses.length === 0 ? (
              <p className="text-muted-foreground">Поки що немає звітів. Створіть перший аналіз.</p>
            ) : (
              analyses.map((a) => (
                <ReportCard key={a.id} report={a as any} compact />
              ))
            )}
          </div>
        </div>
      </section>
    </main>
  )
}
