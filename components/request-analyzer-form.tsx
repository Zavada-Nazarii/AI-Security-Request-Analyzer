"use client"

import type React from "react"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { KeyValueEditor, type KV } from "./key-value-editor"
import { useRouter } from "next/navigation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

type AnalyzeResult = { id: number }

export function RequestAnalyzerForm() {
  const [method, setMethod] = useState("GET")
  const [url, setUrl] = useState("")
  const [params, setParams] = useState<KV[]>([])
  const [headers, setHeaders] = useState<KV[]>([])
  const [cookies, setCookies] = useState<KV[]>([])
  const [body, setBody] = useState("")
  const [raw, setRaw] = useState("")
  const [includeResponse, setIncludeResponse] = useState(false)
  const [headerOnly, setHeaderOnly] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (!raw) return
    try {
      const parsed = parseRawHttp(raw)
      if (parsed.method) setMethod(parsed.method)
      if (parsed.url) setUrl(parsed.url)
      if (parsed.headers) setHeaders(parsed.headers)
      if (parsed.cookies) setCookies(parsed.cookies)
      if (parsed.params) setParams(parsed.params)
      if (parsed.body) setBody(parsed.body)
    } catch {
      // ignore
    }
  }, [raw])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          method,
          url,
          params,
          headers,
          cookies,
          body,
          raw,
          fetchResponse: includeResponse || headerOnly,
          analyzeHeadersOnly: headerOnly,
        }),
      })
      if (!res.ok) {
        const text = await res.text().catch(() => "")
        throw new Error(text || "Помилка аналізу (невідомо)")
      }
      const data = (await res.json()) as AnalyzeResult
      if (!data?.id) throw new Error("Некоректна відповідь сервера")
      router.push(`/reports/${data.id}`)
    } catch (err: any) {
      setError(err?.message || "Сталася помилка")
    } finally {
      setLoading(false)
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    // Try HAR first
    try {
      const har = JSON.parse(text)
      const first = har?.log?.entries?.[0]
      if (first?.request) {
        const r = first.request
        const method = r.method || "GET"
        const url = r.url || ""
        const headers: KV[] = (r.headers || []).map((h: any) => ({ key: h.name, value: h.value }))
        const cookies: KV[] = (r.cookies || []).map((c: any) => ({ key: c.name, value: c.value }))
        const params: KV[] = (r.queryString || []).map((q: any) => ({ key: q.name, value: q.value }))
        const postData = r.postData?.text || ""
        setMethod(method)
        setUrl(url)
        setHeaders(headers)
        setCookies(cookies)
        setParams(params)
        setBody(postData)
        setRaw(text)
        return
      }
    } catch {
      // Not HAR, continue
    }
    setRaw(text)
  }

  const queryString = useMemo(
    () =>
      params
        .filter((p) => p.key)
        .map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
        .join("&"),
    [params],
  )

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle>Формування запиту для аналізу</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid md:grid-cols-[140px_1fr] gap-2">
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger>
                <SelectValue placeholder="Метод" />
              </SelectTrigger>
              <SelectContent>
                {["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"].map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="https://api.example.com/resource"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>

          <KeyValueEditor label="Параметри (query)" initial={params} onChange={setParams} />
          <KeyValueEditor label="Заголовки (headers)" initial={headers} onChange={setHeaders} />
          <KeyValueEditor label="Кукі (cookies)" initial={cookies} onChange={setCookies} />

          <div className="space-y-2">
            <div className="text-sm font-medium">Тіло запиту (body)</div>
            <Textarea
              placeholder="JSON / form / raw"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="min-h-[120px]"
            />
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">Сирий запит або HAR</div>
            <Textarea
              placeholder="Вставте сирий HTTP-запит (або завантажте файл)"
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              className="min-h-[120px]"
            />
            <Input type="file" accept=".txt,.har,application/json,text/plain" onChange={onFile} />
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div className="grid gap-0.5">
              <Label htmlFor="include-response">Проаналізувати відповідь сервера</Label>
              <div className="text-xs text-muted-foreground">
                Якщо увімкнено — сервер виконає реальний запит і додасть у звіт аналіз відповіді.
              </div>
            </div>
            <Switch
              id="include-response"
              checked={includeResponse}
              onCheckedChange={(v) => {
                setIncludeResponse(v)
                if (!v && headerOnly) setHeaderOnly(false)
              }}
            />
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div className="grid gap-0.5">
              <Label htmlFor="header-only">Аналізувати лише заголовки відповіді</Label>
              <div className="text-xs text-muted-foreground">
                Модель пояснить призначення кожного заголовка, позначить нестандартні та оцінить ризики, беручи до уваги
                запит.
              </div>
            </div>
            <Switch
              id="header-only"
              checked={headerOnly}
              onCheckedChange={(v) => {
                setHeaderOnly(v)
                if (v) setIncludeResponse(true)
              }}
              disabled={!includeResponse && !headerOnly}
            />
          </div>

          {error && (
            <div className="text-sm text-red-600" role="alert">
              {error}
            </div>
          )}

          <div className="text-xs text-muted-foreground">
            Попередній перегляд повного URL: {url}
            {queryString ? `?${queryString}` : ""}
          </div>

          <Button type="submit" disabled={loading}>
            {loading ? "Аналіз..." : "Надіслати на аналіз ШІ"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function parseRawHttp(text: string) {
  const lines = text.split(/\r?\n/)
  let method = "GET"
  let path = ""
  let httpVersion = ""
  let i = 0
  const rl = lines[i++]?.trim()
  const m = rl?.match(/^([A-Z]+)\s+(\S+)\s+HTTP\/(\d\.\d)/)
  if (m) {
    method = m[1]
    path = m[2]
    httpVersion = m[3]
  }
  const headers: KV[] = []
  while (i < lines.length) {
    const line = lines[i++]
    if (line.trim() === "") break
    const idx = line.indexOf(":")
    if (idx > -1) {
      const key = line.slice(0, idx).trim()
      const value = line.slice(idx + 1).trim()
      headers.push({ key, value })
    }
  }
  const body = lines.slice(i).join("\n")
  const host = headers.find((h) => h.key.toLowerCase() === "host")?.value || ""
  const url = host ? (path.startsWith("http") ? path : `https://${host}${path}`) : path
  const cookieHeader = headers.find((h) => h.key.toLowerCase() === "cookie")?.value || ""
  const cookies: KV[] = cookieHeader
    ? cookieHeader.split(";").map((c) => {
        const [k, ...rest] = c.trim().split("=")
        return { key: k, value: rest.join("=") }
      })
    : []
  const qp = (url.split("?")[1] || "").split("#")[0]
  const params: KV[] = qp
    ? qp
        .split("&")
        .filter(Boolean)
        .map((p) => {
          const [k, ...rest] = p.split("=")
          return { key: decodeURIComponent(k), value: decodeURIComponent(rest.join("=") || "") }
        })
    : []
  return { method, url, httpVersion, headers, cookies, params, body }
}
