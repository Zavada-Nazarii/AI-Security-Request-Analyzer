"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Clipboard, ClipboardCheck, ExternalLink, AlertTriangle } from "lucide-react"
import type { AIAnalysis } from "@/types/analysis"
import { useToast } from "@/hooks/use-toast"

type Props = {
  analysis: any | AIAnalysis
}

const sevOrder = ["Critical", "High", "Medium", "Low", "Info"] as const
const sevToClasses: Record<string, string> = {
  Critical: "bg-red-600 text-white",
  High: "bg-orange-500 text-white",
  Medium: "bg-amber-500 text-white",
  Low: "bg-emerald-600 text-white",
  Info: "bg-gray-600 text-white",
}

function SevBadge({ severity }: { severity: string }) {
  const cls = sevToClasses[severity] || "bg-gray-600 text-white"
  return <Badge className={cls}>{severity}</Badge>
}

function CopyButton({ text, size = "sm" as const }: { text: string; size?: "sm" | "default" }) {
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

  async function copyWithFallback(payload: string) {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(payload)
        return true
      }
    } catch {}
    try {
      const ta = document.createElement("textarea")
      ta.value = payload
      ta.style.position = "fixed"
      ta.style.top = "-1000px"
      ta.style.left = "-1000px"
      ta.setAttribute("readonly", "true")
      document.body.appendChild(ta)
      ta.select()
      ta.setSelectionRange(0, ta.value.length)
      const ok = document.execCommand("copy")
      document.body.removeChild(ta)
      if (ok) return true
    } catch {}
    return false
  }

  async function onCopy() {
    const ok = await copyWithFallback(text)
    setCopied(ok)
    if (ok) {
      toast({ title: "Скопійовано", description: "Текст додано у буфер обміну" })
      setTimeout(() => setCopied(false), 1500)
    } else {
      toast({
        title: "Не вдалося скопіювати",
        description: "Скопіюйте вручну",
        variant: "destructive",
      })
    }
  }

  return (
    <Button type="button" size={size} variant="secondary" onClick={onCopy}>
      {copied ? <ClipboardCheck className="w-4 h-4 mr-2" /> : <Clipboard className="w-4 h-4 mr-2" />}
      {copied ? "Скопійовано" : "Копіювати"}
    </Button>
  )
}

export function AnalysisView({ analysis }: Props) {
  const severityCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    if (analysis.severityCounts) {
      for (const [k, v] of Object.entries(analysis.severityCounts)) counts[k] = v as number
    } else {
      for (const f of analysis.findings || []) {
        counts[f.severity] = (counts[f.severity] || 0) + 1
      }
    }
    return counts
  }, [analysis])

  const sortedFindings = useMemo(() => {
    const arr = [...(analysis.findings || [])]
    arr.sort((a, b) => sevOrder.indexOf(a.severity) - sevOrder.indexOf(b.severity))
    return arr
  }, [analysis])

  const httpResponse = analysis?.httpResponse as
    | undefined
    | {
        url: string
        status: number
        statusText: string
        headers: Array<{ name: string; value: string }>
        contentType?: string | null
        contentLength?: number | null
        bodyPreview?: string | null
        fetchedAt?: string
      }

  function tryFormatBody(preview: string | null | undefined, contentType?: string | null) {
    if (!preview) return ""
    if (contentType && /application\/json/i.test(contentType)) {
      try {
        return JSON.stringify(JSON.parse(preview), null, 2)
      } catch {
        // fallback to raw
      }
    }
    return preview
  }

  return (
    <div className="grid gap-6">
      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Підсумок</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid md:grid-cols-[1fr_1fr] gap-4">
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Загальний ризик</div>
              <div className="flex items-center gap-3">
                <div className="text-3xl font-bold tabular-nums">{Math.round(analysis.overallRiskScore ?? 0)}%</div>
                <div className="flex-1 h-2 rounded bg-muted overflow-hidden">
                  <div
                    className="h-full bg-red-500"
                    style={{ width: `${Math.max(0, Math.min(100, analysis.overallRiskScore ?? 0))}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Кількість знахідок за рівнями</div>
              <div className="flex flex-wrap gap-2">
                {sevOrder.map((s) => (
                  <div key={s} className="inline-flex items-center gap-2 rounded border px-2 py-1 text-sm">
                    <SevBadge severity={s} />
                    <span className="tabular-nums">{severityCounts[s] || 0}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {analysis.nextSteps?.length ? (
            <Alert>
              <AlertTriangle className="w-4 h-4" />
              <AlertTitle>Наступні кроки</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-5 space-y-1">
                  {analysis.nextSteps.map((n: string, i: number) => (
                    <li key={i}>{n}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          ) : null}
          <Separator />
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{analysis.summary}</p>
        </CardContent>
      </Card>

      {/* Optional HTTP Response */}
      {httpResponse && (
        <Card>
          <CardHeader>
            <CardTitle>HTTP відповідь</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid lg:grid-cols-2 gap-4">
              <div className="rounded border">
                <div className="px-3 py-2 border-b text-sm font-medium">Статус</div>
                <div className="p-3 text-sm">
                  <div className="font-mono">
                    {httpResponse.status} {httpResponse.statusText}
                  </div>
                  <div className="text-xs text-muted-foreground break-all">{httpResponse.url}</div>
                </div>
              </div>
              <div className="rounded border">
                <div className="px-3 py-2 border-b text-sm font-medium">Мета</div>
                <div className="p-3 text-sm grid gap-1">
                  <div>
                    Content-Type: <span className="font-mono">{httpResponse.contentType || "—"}</span>
                  </div>
                  <div>
                    Content-Length: <span className="font-mono">{httpResponse.contentLength ?? "—"}</span>
                  </div>
                  <div>
                    Отримано:{" "}
                    <span className="font-mono">
                      {httpResponse.fetchedAt ? new Date(httpResponse.fetchedAt).toLocaleString() : "—"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded border">
              <div className="px-3 py-2 border-b text-sm font-medium">Заголовки</div>
              <div className="p-3 text-xs grid gap-1">
                {httpResponse.headers?.length ? (
                  httpResponse.headers.map((h, i) => (
                    <div key={i} className="font-mono break-all">
                      {h.name}: {h.value}
                    </div>
                  ))
                ) : (
                  <div className="text-muted-foreground">Немає заголовків</div>
                )}
              </div>
            </div>

            {httpResponse.bodyPreview ? (
              <div className="rounded border overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 border-b">
                  <div className="text-sm font-medium">Тіло відповіді (перші ~10k символів)</div>
                  <CopyButton text={httpResponse.bodyPreview || ""} />
                </div>
                <pre className="text-xs bg-muted p-3 overflow-auto whitespace-pre-wrap">
                  {tryFormatBody(httpResponse.bodyPreview, httpResponse.contentType)}
                </pre>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      {/* Findings */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle>Знахідки</CardTitle>
          <div className="text-sm text-muted-foreground">{sortedFindings.length} елементів</div>
        </CardHeader>
        <CardContent>
          {sortedFindings.length === 0 ? (
            <div className="text-sm text-muted-foreground">Немає знайдених вразливостей.</div>
          ) : (
            <Accordion type="multiple" className="w-full">
              {sortedFindings.map((f: any, i: number) => (
                <AccordionItem key={i} value={`f-${i}`}>
                  <AccordionTrigger>
                    <div className="flex items-center gap-3 text-left">
                      <SevBadge severity={f.severity} />
                      <div className="font-medium">{f.title}</div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid gap-4 p-1">
                      {f.description && (
                        <div>
                          <div className="text-sm font-semibold mb-1">Опис</div>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{f.description}</p>
                        </div>
                      )}

                      {f.evidence && (
                        <div>
                          <div className="text-sm font-semibold mb-1">Доказ/Підстави</div>
                          <pre className="text-xs bg-muted rounded p-3 overflow-auto whitespace-pre-wrap">
                            {f.evidence}
                          </pre>
                        </div>
                      )}

                      {f.recommendations?.length ? (
                        <div>
                          <div className="text-sm font-semibold mb-1">Рекомендації</div>
                          <ul className="list-disc pl-5 space-y-1 text-sm">
                            {f.recommendations.map((r: string, idx: number) => (
                              <li key={idx}>{r}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}

                      {f.commands?.length ? (
                        <div className="grid gap-2">
                          <div className="flex items-center justify-between">
                            <div className="text-sm font-semibold">Команди</div>
                          </div>
                          <div className="grid gap-3">
                            {f.commands.map((cmd: string, idx: number) => (
                              <div key={idx} className="rounded border overflow-hidden">
                                <div className="flex items-center justify-between px-2 py-1 border-b bg-card">
                                  <span className="text-xs text-muted-foreground">Команда #{idx + 1}</span>
                                  <CopyButton text={cmd} />
                                </div>
                                <pre className="text-xs bg-muted p-3 overflow-auto whitespace-pre-wrap">{cmd}</pre>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {f.references?.length ? (
                          <div className="sm:col-span-2 lg:col-span-3">
                            <div className="text-sm font-semibold mb-1">Джерела</div>
                            <ul className="list-disc pl-5 space-y-1 text-sm">
                              {f.references.map((ref: string, idx: number) => (
                                <li key={idx}>
                                  <a
                                    href={ref}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    {ref}
                                  </a>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>

      {/* HTTP Insights */}
      <Card>
        <CardHeader>
          <CardTitle>HTTP інсайти</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            <HeaderInsightList items={analysis?.httpInsights?.headers || []} />
            {/* You can keep cookies/params/body lists below if desired */}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function HeaderInsightList({
  items,
}: {
  items: Array<{
    name: string
    purpose?: string
    isStandard?: boolean
    issues?: string[]
    recommendations?: string[]
    exampleCommands?: string[]
  }>
}) {
  if (!items || items.length === 0) {
    return <div className="text-sm text-muted-foreground">Немає даних по заголовках.</div>
  }
  return (
    <div className="grid gap-3">
      {items.map((x, i) => (
        <Card key={i}>
          <CardHeader className="py-3 flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">{x.name}</CardTitle>
              {x.isStandard === false && <Badge className="bg-amber-500 text-white">нестандартний</Badge>}
            </div>
            {x.purpose && <div className="text-xs text-muted-foreground">{x.purpose}</div>}
          </CardHeader>
          <CardContent className="grid gap-3">
            {x.issues?.length ? (
              <div>
                <div className="text-sm font-semibold mb-1">Проблеми</div>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  {x.issues.map((it, idx) => (
                    <li key={idx}>{it}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {x.recommendations?.length ? (
              <div>
                <div className="text-sm font-semibold mb-1">Рекомендації</div>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  {x.recommendations.map((it, idx) => (
                    <li key={idx}>{it}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {x.exampleCommands?.length ? (
              <div className="grid gap-2">
                <div className="text-sm font-semibold">Приклади команд</div>
                <div className="grid gap-2">
                  {x.exampleCommands.map((cmd, idx) => (
                    <div key={idx} className="rounded border overflow-hidden">
                      <div className="flex items-center justify-between px-2 py-1 border-b bg-card">
                        <span className="text-xs text-muted-foreground">Команда #{idx + 1}</span>
                        <CopyButton text={cmd} />
                      </div>
                      <pre className="text-xs bg-muted p-3 overflow-auto whitespace-pre-wrap">{cmd}</pre>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
