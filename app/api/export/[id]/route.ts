import { NextResponse } from "next/server"
import { getAnalysisById } from "@/lib/db"

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id)
  const report = await getAnalysisById(id)
  if (!report) {
    return new NextResponse("Not found", { status: 404 })
  }
  const body = {
    id: report.id,
    createdAt: report.createdAt,
    method: report.method,
    url: report.url,
    raw: report.raw,
    model: report.model,
    summary: report.summary,
    analysis: report.aiJson,
  }
  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="analysis-${report.id}.json"`,
    },
  })
}
