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
  fetchResponse?: boolean
  analyzeHeadersOnly?: boolean
}) {
  const settings = await getSettings()
  const provider = settings.provider || "xai"
  const modelName = settings.model || (provider === "openai" ? "gpt-4o" : "grok-3")

  // Resolve model with API key using factory
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

  // Optionally perform the real HTTP request
  const respSnapshot = input.fetchResponse
    ? await fetchSnapshot(input).catch((e) => ({
        url: input.url,
        status: 0,
        statusText: "NETWORK_ERROR",
        headers: [] as Array<{ name: string; value: string }>,
        contentType: null,
        contentLength: null,
        bodyPreview: String(e?.message || e || "Unknown error"),
        fetchedAt: new Date().toISOString(),
      }))
    : null

  const schema = z.object({
    summary: z.string(),
    overallRiskScore: z.number().min(0).max(100),
    severityCounts: z.record(z.string(), z.number()).optional(),
    findings: z.array(
      z.object({
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
      }),
    ),
    httpInsights: z.object({
      headers: z
        .array(
          z.object({
            name: z.string(),
            purpose: z.string().optional(),
            isStandard: z.boolean().default(true),
            issues: z.array(z.string()).default([]),
            recommendations: z.array(z.string()).default([]),
            exampleCommands: z.array(z.string()).default([]),
          }),
        )
        .default([]),
      cookies: z
        .array(
          z.object({
            name: z.string(),
            issues: z.array(z.string()).default([]),
            recommendations: z.array(z.string()).default([]),
            exampleCommands: z.array(z.string()).default([]),
          }),
        )
        .default([]),
      params: z
        .array(
          z.object({
            name: z.string(),
            issues: z.array(z.string()).default([]),
            recommendations: z.array(z.string()).default([]),
            exampleCommands: z.array(z.string()).default([]),
          }),
        )
        .default([]),
      bodyFindings: z
        .array(
          z.object({
            key: z.string(),
            issues: z.array(z.string()).default([]),
            recommendations: z.array(z.string()).default([]),
            exampleCommands: z.array(z.string()).default([]),
          }),
        )
        .default([]),
    }),
    nextSteps: z.array(z.string()).default([]),
  })

  const prompt = buildPrompt(input, respSnapshot)

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
    aiJson: respSnapshot ? { ...object, httpResponse: respSnapshot } : object,
    model: `${provider}:${modelName}`,
  })

  return { id: created.id }
}

function buildPrompt(
  input: {
    method: string
    url: string
    params: KV[]
    headers: KV[]
    cookies: KV[]
    body: string
    raw: string
    analyzeHeadersOnly?: boolean
  },
  resp: null | {
    url: string
    status: number
    statusText: string
    headers: Array<{ name: string; value: string }>
    contentType?: string | null
    contentLength?: number | null
    bodyPreview?: string | null
  },
) {
  const lines: string[] = []
  lines.push(
    "You are a senior application security analyst. Analyze the HTTP request and, if provided, the server response. Produce a combined, practical security report.",
  )
  lines.push("")
  lines.push("Task requirements:")
  lines.push("- Consider headers, query parameters, cookies, and body of the request.")
  if (resp) {
    if (input.analyzeHeadersOnly) {
      lines.push(
        "- Focus ONLY on the response headers in combination with the request context. Explain each header's purpose in clear terms, mark if it appears non-standard, evaluate security implications (CORS, cache, CSP, cookies, HSTS, referrer-policy, x-frame-options, x-content-type-options, etc.).",
      )
      lines.push(
        "- Provide issues and concrete recommendations per header, with practical command examples (curl, nuclei, etc.).",
      )
      lines.push("- Keep findings concise and prioritize risk. Still return overall summary and next steps.")
    } else {
      lines.push(
        "- If response is provided: analyze status, headers, and body for security implications (info leaks, CORS, cache control, cookies, error disclosure, SSRF reflections, HTML/JSON issues, etc.).",
      )
    }
  }
  lines.push(
    "- Identify injection points (SQLi, XSS, SSTI), auth/session weaknesses, CSRF, SSRF, IDOR, deserialization, misconfiguration.",
  )
  lines.push(
    "- Include practical commands for tools (curl, wget, sqlmap, ffuf, nuclei, nmap, jwt-tool, zap/burp, etc.).",
  )
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
  if (resp) {
    lines.push("")
    lines.push("Response snapshot (from real request):")
    lines.push(`Status: ${resp.status} ${resp.statusText}`)
    lines.push(`Headers: ${json(resp.headers)}`)
    if (!input.analyzeHeadersOnly) {
      lines.push(`Body preview (first ~8000 chars):\n${(resp.bodyPreview || "").slice(0, 8000)}`)
    } else {
      lines.push("Body is intentionally excluded from analysis (header-only mode).")
    }
  }
  lines.push("")
  lines.push(
    "Return a concise but comprehensive structured object: httpInsights.headers must include for each header: name, purpose (short explanation), isStandard (boolean), issues, recommendations, exampleCommands.",
  )
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
  const q = new URLSearchParams(u.search)
  for (const p of input.params || []) if (p.key) q.set(p.key, p.value)
  const path = u.pathname + (q.toString() ? `?${q.toString()}` : "")
  const host = u.host
  const headerLines = (input.headers || []).filter((h) => h.key).map((h) => `${h.key}: ${h.value}`)
  const cookieLine = (input.cookies || []).length
    ? [`Cookie: ${(input.cookies || []).map((c) => `${c.key}=${c.value}`).join("; ")}`]
    : []
  const lines = [
    `${input.method} ${path} HTTP/1.1`,
    `Host: ${host}`,
    ...headerLines,
    ...cookieLine,
    "",
    input.body || "",
  ]
  return lines.join("\n")
}

function json(v: any) {
  try {
    return JSON.stringify(v)
  } catch {
    return String(v)
  }
}

async function fetchSnapshot(input: {
  method: string
  url: string
  params: KV[]
  headers: KV[]
  cookies: KV[]
  body: string
}) {
  const base = new URL(input.url, input.url.startsWith("http") ? undefined : "https://placeholder.local")
  // Merge query params from UI into URL
  for (const p of input.params || []) {
    if (p.key) base.searchParams.set(p.key, p.value)
  }

  // Build headers
  const hdrs = new Headers()
  for (const h of input.headers || []) {
    if (!h.key) continue
    try {
      hdrs.set(h.key, h.value)
    } catch {
      /* ignore invalid header */
    }
  }
  const cookieStr = (input.cookies || [])
    .filter((c) => c.key)
    .map((c) => `${c.key}=${c.value}`)
    .join("; ")
  if (cookieStr) {
    const existing = hdrs.get("cookie")
    hdrs.set("cookie", [existing, cookieStr].filter(Boolean).join("; "))
  }

  // Body only for methods that allow it
  const method = input.method.toUpperCase()
  const allowBody = !["GET", "HEAD"].includes(method)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)

  let res: Response
  try {
    res = await fetch(base.toString(), {
      method,
      headers: hdrs,
      body: allowBody && input.body ? input.body : undefined,
      redirect: "follow",
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeout)
  }

  const contentType = res.headers.get("content-type")
  const contentLengthHdr = res.headers.get("content-length")
  const contentLength = contentLengthHdr ? Number(contentLengthHdr) : null

  // Read body safely; cap to ~10000 chars
  let bodyPreview = ""
  try {
    const isTextLike =
      !contentType || /^(text\/|application\/(json|xml|javascript|x-www-form-urlencoded))/.test(contentType)
    if (isTextLike) {
      const raw = await res.text()
      bodyPreview = raw.slice(0, 10000)
    } else {
      bodyPreview = `[non-text content: ${contentType || "unknown"}; length=${contentLength ?? "?"}]`
    }
  } catch (e: any) {
    bodyPreview = `Failed to read response body: ${e?.message || e}`
  }

  const headersArr: Array<{ name: string; value: string }> = []
  res.headers.forEach((value, name) => {
    headersArr.push({ name, value })
  })

  return {
    url: res.url || base.toString(),
    status: res.status,
    statusText: res.statusText,
    headers: headersArr,
    contentType,
    contentLength,
    bodyPreview,
    fetchedAt: new Date().toISOString(),
  }
}
