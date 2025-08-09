"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { DeleteReportButton } from "./delete-report-button"

type SeverityCount = { severity: string; count: number }

export function ReportCard({
  report,
  compact = false,
}: {
  report: {
    id: number
    createdAt: string
    method: string
    url: string
    summary?: string
    aiJson?: any
  }
  compact?: boolean
}) {
  const counts: SeverityCount[] = extractCounts(report.aiJson)
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div className="min-w-0">
          <CardTitle className="truncate">{report.method} {report.url}</CardTitle>
          <div className="text-xs text-muted-foreground">{new Date(report.createdAt).toLocaleString()}</div>
        </div>
        <div className="flex gap-2 shrink-0">
          {!compact && (
            <DeleteReportButton id={report.id} variant="outline" size="sm">Видалити</DeleteReportButton>
          )}
          <Link href={`/reports/${report.id}`}>
            <Button variant="default" size="sm">Деталі</Button>
          </Link>
        </div>
      </CardHeader>
      {!compact && (
        <CardContent className="grid md:grid-cols-[1fr_300px] gap-4">
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{report.summary || "—"}</p>
          <div className="h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={counts}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="severity" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      )}
    </Card>
  )
}

function extractCounts(aiJson: any): SeverityCount[] {
  const map = new Map<string, number>()
  if (aiJson?.severityCounts && typeof aiJson.severityCounts === "object") {
    for (const [sev, cnt] of Object.entries(aiJson.severityCounts)) {
      map.set(String(sev), Number(cnt))
    }
  } else if (Array.isArray(aiJson?.findings)) {
    for (const f of aiJson.findings) {
      const k = (f.severity || "Info") as string
      map.set(k, (map.get(k) || 0) + 1)
    }
  }
  const order = ["Critical", "High", "Medium", "Low", "Info"]
  const list = Array.from(map.entries()).map(([severity, count]) => ({ severity, count }))
  list.sort((a, b) => order.indexOf(a.severity) - order.indexOf(b.severity))
  return list
}
