import { NextResponse } from "next/server"
import { getSettings } from "@/lib/db"
import { createOpenAI } from "@ai-sdk/openai"
import { createXAI } from "@ai-sdk/xai"
import { generateText } from "ai"

export async function POST() {
  try {
    const s = await getSettings()
    const provider = s.provider || "xai"
    const model = s.model || (provider === "openai" ? "gpt-4o" : "grok-3")

    let modelInstance: any
    if (provider === "openai") {
      if (!s.openai_api_key) return new NextResponse("OPENAI_API_KEY не задано", { status: 400 })
      const openai = createOpenAI({ apiKey: s.openai_api_key })
      modelInstance = openai(model as any)
    } else {
      if (!s.xai_api_key) return new NextResponse("XAI_API_KEY не задано", { status: 400 })
      const xai = createXAI({ apiKey: s.xai_api_key })
      modelInstance = xai(model as any)
    }

    const { text } = await generateText({
      model: modelInstance,
      prompt: "ping",
    })

    return NextResponse.json({ ok: true, provider, model, text })
  } catch (e: any) {
    console.error("Debug/ping error:", e?.stack || e)
    return new NextResponse(e?.message || "Ping failed", { status: 400 })
  }
}
