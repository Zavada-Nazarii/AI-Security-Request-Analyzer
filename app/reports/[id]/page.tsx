import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { verifySession } from "@/lib/auth"
import { getAnalysisById } from "@/lib/db"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { PrintButton } from "@/components/print-button"
import { AnalysisView } from "@/components/analysis-view"
import { DeleteReportButton } from "@/components/delete-report-button"

export default async function ReportDetailPage({ params }: { params: { id: string } }) {
  const cookieStore = await cookies()
  const session = cookieStore.get("session")?.value
  const valid = await verifySession(session || "")
  if (!valid) redirect("/login")

  const report = await getAnalysisById(Number(params.id)).catch(() => null)
  if (!report) {
    redirect("/reports")
  }

  return (
    <main className="container mx-auto p-4 md:p-6 space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold">Звіт #{report.id}</h1>
          <p className="text-sm text-muted-foreground">{new Date(report.createdAt).toLocaleString()}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/api/export/${report.id}`}>
            <Button variant="outline">Експорт JSON</Button>
          </Link>
          <PrintButton />
          <DeleteReportButton id={report.id} redirectTo="/reports" />
          <Link href="/reports">
            <Button variant="ghost">Назад</Button>
          </Link>
        </div>
      </header>

      <section className="rounded-lg border bg-card p-4">
        <div className="grid gap-1">
          <div className="text-sm text-muted-foreground">{report.method}</div>
          <div className="font-semibold break-all">{report.url}</div>
        </div>
      </section>

      {report.aiJson ? (
        <AnalysisView analysis={report.aiJson} />
      ) : (
        <section className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Структуровані дані відсутні.</p>
        </section>
      )}

      <section className="rounded-lg border bg-card p-4">
        <h2 className="text-xl font-semibold mb-2">Сирий запит</h2>
        <pre className="text-xs overflow-auto whitespace-pre-wrap">{report.raw}</pre>
      </section>
    </main>
  )
}
