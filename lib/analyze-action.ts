"use server"

import { generateObject } from "ai"
import { z } from "zod"
import { createXAI } from "@ai-sdk/xai"
import { createOpenAI } from "@ai-sdk/openai"
import { getSettings, saveAnalysis } from "./db"

type KV = { key: string; value: string }

export async function analyzeAction(input: {
  method: string
  url: string
  params: KV[]
  headers: KV[]
  cookies: KV[]
  body: string
  raw: string
}) {
  const settings = await getSettings()
  const provider = settings.provider || "xai"
  const modelName = settings.model || (provider === "openai" ? "gpt-4o" : "grok-3")

  // Resolve model with proper API key using create* factory
  let model: any
  if (provider === "openai") {
    if (!settings.openai_api_key) {
      throw new Error("Вкажіть OPENAI_API_KEY у Налаштуваннях або перемкніть провайдера.")
    }
    const openai = createOpenAI({ apiKey: settings.openai_api_key })
    model = openai(modelName as any)
  } else if (provider === "xai") {
    if (!settings.xai_api_key) {
      throw new Error("Вкажіть XAI_API_KEY у Налаштуваннях або перемкніть провайдера.")
    }
    const xai = createXAI({ apiKey: settings.xai_api_key })
    model = xai(modelName as any)
  } else {
    throw new Error("Невідомий провайдер ШІ у Налаштуваннях.")
  }

  const schema = z.object({
    summary: z.string(),
    overallRiskScore: z.number().min(0).max(100),
    severityCounts: z.record(z.string(), z.number()).optional(),
    findings: z.array(z.object({
      title: z.string(),
      severity: z.enum(["Critical", "High", "Medium", "Low", "Info"]).default("Info"),
      description: z.string(),
      evidence: z.string().optional(),
      recommendations: z.array(z.string()).default([]),
      commands: z.array(z.string()).default([]),
      references: z.array(z.string()).default([]),
      relatedHeaders: z.array(z.string()).default([]),
      relatedParams: z.array(z.string()).default([]),
      relatedCookies: z.array(z.string()).default([]),
      relatedBodyKeys: z.array(z.string()).default([]),
    })),
    httpInsights: z.object({
      headers: z.array(z.object({
        name: z.string(),
        issues: z.array(z.string()).default([]),
        recommendations: z.array(z.string()).default([]),
        exampleCommands: z.array(z.string()).default([]),
      })).default([]),
      cookies: z.array(z.object({
        name: z.string(),
        issues: z.array(z.string()).default([]),
        recommendations: z.array(z.string()).default([]),
        exampleCommands: z.array(z.string()).default([]),
      })).default([]),
      params: z.array(z.object({
        name: z.string(),
        issues: z.array(z.string()).default([]),
        recommendations: z.array(z.string()).default([]),
        exampleCommands: z.array(z.string()).default([]),
      })).default([]),
      bodyFindings: z.array(z.object({
        key: z.string(),
        issues: z.array(z.string()).default([]),
        recommendations: z.array(z.string()).default([]),
        exampleCommands: z.array(z.string()).default([]),
      })).default([]),
    }),
    nextSteps: z.array(z.string()).default([]),
  })

  const prompt = buildPrompt(input)

  const { object } = await generateObject({
    model,
    schema,
    prompt,
  })

  const created = await saveAnalysis({
    createdAt: new Date().toISOString(),
    method: input.method,
    url: input.url,
    raw: input.raw || renderRaw(input),
    summary: object.summary,
    aiJson: object,
    model: `${provider}:${modelName}`,
  })

  return { id: created.id }
}

function buildPrompt(input: {
  method: string
  url: string
  params: KV[]
  headers: KV[]
  cookies: KV[]
  body: string
  raw: string
}) {
  const lines: string[] = []
  lines.push("You are a senior application security analyst. Analyze the following HTTP request for penetration testing opportunities and security risks. Provide concrete, practical, reproducible suggestions.")
  lines.push("")
  lines.push("Task requirements:")
  lines.push("- Consider headers, query parameters, cookies, and body.")
  lines.push("- Identify potential injection points (SQLi, XSS, SSTI), auth/session weaknesses, CSRF, SSRF, IDOR, deserialization, misconfig, etc.")
  lines.push("- Include practical commands for tools (curl, wget, sqlmap, ffuf, nuclei templates, nmap, jwt-tool, owasp zap/burp, etc.).")
  lines.push("- Recommend secure configurations for each header/cookie suspected weak.")
  lines.push("- Suggest fuzz lists or payload categories where applicable.")
  lines.push("")
  lines.push("Request (normalized parts):")
  lines.push(`Method: ${input.method}`)
  lines.push(`URL: ${input.url}`)
  lines.push(`Params: ${json(input.params)}`)
  lines.push(`Headers: ${json(input.headers)}`)
  lines.push(`Cookies: ${json(input.cookies)}`)
  lines.push(`Body: ${input.body ? input.body.slice(0, 4000) : ""}`)
  if (input.raw) {
    lines.push("")
    lines.push("Raw request (user-supplied):")
    lines.push(input.raw.slice(0, 7000))
  }
  return lines.join("\n")
}

function renderRaw(input: {
  method: string
  url: string
  params: KV[]
  headers: KV[]
  cookies: KV[]
  body: string
}) {
  const u = new URL(input.url, input.url.startsWith("http") ? undefined : "https://placeholder.local")
  const q = new URLSearchParams()
  for (const p of input.params || []) if (p.key) q.set(p.key, p.value)
  const path = u.pathname + (q.toString() ? `?${q.toString()}` : "")
  const host = u.host
  const headerLines = (input.headers || [])
    .filter((h) => h.key)
    .map((h) => `${h.key}: ${h.value}`)
  const cookieLine = (input.cookies || []).length
    ? [`Cookie: ${(input.cookies || []).map((c) => `${c.key}=${c.value}`).join("; ")}`]
    : []
  const lines = [`${input.method} ${path} HTTP/1.1`, `Host: ${host}`, ...headerLines, ...cookieLine, "", input.body || ""]
  return lines.join("\n")
}

function json(v: any) {
  try { return JSON.stringify(v) } catch { return String(v) }
}
