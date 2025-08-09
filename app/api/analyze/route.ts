import { NextResponse } from "next/server"
import { analyzeAction } from "@/lib/analyze-action"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const result = await analyzeAction({
      method: String(body?.method || "GET"),
      url: String(body?.url || ""),
      params: Array.isArray(body?.params) ? body.params : [],
      headers: Array.isArray(body?.headers) ? body.headers : [],
      cookies: Array.isArray(body?.cookies) ? body.cookies : [],
      body: String(body?.body || ""),
      raw: String(body?.raw || ""),
      fetchResponse: Boolean(body?.fetchResponse),
      analyzeHeadersOnly: Boolean(body?.analyzeHeadersOnly),
    })
    return NextResponse.json(result, { status: 200 })
  } catch (e: any) {
    console.error("Analyze error:", e?.stack || e?.message || e)
    const msg = e?.message || "Помилка під час аналізу. Перевірте ключ/модель у Налаштуваннях."
    return new NextResponse(msg, { status: 400 })
  }
}
