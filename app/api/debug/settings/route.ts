import { NextResponse } from "next/server"
import { getSettings } from "@/lib/db"

export async function GET() {
  try {
    const s = await getSettings()
    return NextResponse.json({
      provider: s.provider || "xai",
      model: s.model || null,
      hasOpenAIKey: !!s.openai_api_key,
      hasXAIKey: !!s.xai_api_key,
    })
  } catch (e: any) {
    console.error("Debug/settings error:", e)
    return new NextResponse("Failed to read settings", { status: 500 })
  }
}
