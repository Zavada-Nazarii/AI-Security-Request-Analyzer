"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Clipboard, ClipboardCheck, ExternalLink, Info, ShieldAlert, AlertTriangle } from 'lucide-react'
import type { AIAnalysis } from "@/types/analysis"

type Props = {
  analysis: AIAnalysis
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
  return (
    <Button
      type="button"
      size={size}
      variant="secondary"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        } catch {}
      }}
    >
      {copied ? <ClipboardCheck className="w-4 h-4 mr-2" /> : <Clipboard className="w-4 h-4 mr-2" />}
      {copied ? "Скопійовано" : "Копіювати"}
    </Button>
  )
}

export function AnalysisView({ analysis }: Props) {
  const severityCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    if (analysis.severityCounts) {
      for (const [k, v] of Object.entries(analysis.severityCounts)) counts[k] = v
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
                <div className="text-3xl font-bold tabular-nums">{Math.round(analysis.overallRiskScore)}%</div>
                <div className="flex-1 h-2 rounded bg-muted overflow-hidden">
                  <div
                    className="h-full bg-red-500"
                    style={{ width: `${Math.max(0, Math.min(100, analysis.overallRiskScore))}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Кількість знахідок за рівнями</div>
              <div className="flex flex-wrap gap-2">
                {sevOrder.map((s) => (
                  <div
                    key={s}
                    className="inline-flex items-center gap-2 rounded border px-2 py-1 text-sm"
                  >
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
                  {analysis.nextSteps.map((n, i) => (
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
              {sortedFindings.map((f, i) => (
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
                            {f.recommendations.map((r, idx) => (
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
                            {f.commands.map((cmd, idx) => (
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

                      {f.references?.length ? (
                        <div>
                          <div className="text-sm font-semibold mb-1">Джерела</div>
                          <ul className="list-disc pl-5 space-y-1 text-sm">
                            {f.references.map((ref, idx) => (
                              <li key={idx}>
                                <a href={ref} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:underline">
                                  <ExternalLink className="w-3 h-3" />
                                  {ref}
                                </a>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}

                      {/* Related signals */}
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {f.relatedHeaders?.length ? (
                          <KVGroup title="Пов'язані заголовки" items={f.relatedHeaders} />
                        ) : null}
                        {f.relatedParams?.length ? (
                          <KVGroup title="Пов'язані параметри" items={f.relatedParams} />
                        ) : null}
                        {f.relatedCookies?.length ? (
                          <KVGroup title="Пов'язані кукі" items={f.relatedCookies} />
                        ) : null}
                        {f.relatedBodyKeys?.length ? (
                          <KVGroup title="Ключі тіла запиту" items={f.relatedBodyKeys} />
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
          <Tabs defaultValue="headers">
            <TabsList className="flex flex-wrap">
              <TabsTrigger value="headers">Заголовки</TabsTrigger>
              <TabsTrigger value="cookies">Кукі</TabsTrigger>
              <TabsTrigger value="params">Параметри</TabsTrigger>
              <TabsTrigger value="body">Тіло</TabsTrigger>
            </TabsList>
            <TabsContent value="headers">
              <InsightList items={analysis.httpInsights?.headers || []} />
            </TabsContent>
            <TabsContent value="cookies">
              <InsightList items={analysis.httpInsights?.cookies || []} />
            </TabsContent>
            <TabsContent value="params">
              <InsightList items={analysis.httpInsights?.params || []} />
            </TabsContent>
            <TabsContent value="body">
              <BodyInsightList items={analysis.httpInsights?.bodyFindings || []} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

function KVGroup({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded border">
      <div className="px-3 py-2 border-b text-sm font-medium">{title}</div>
      <div className="p-3 flex flex-wrap gap-2">
        {items.map((it, i) => (
          <Badge key={i} variant="secondary" className="font-normal">{it}</Badge>
        ))}
      </div>
    </div>
  )
}

function InsightList({
  items,
}: {
  items: Array<{ name: string; issues: string[]; recommendations: string[]; exampleCommands: string[] }>
}) {
  if (!items || items.length === 0) {
    return <div className="text-sm text-muted-foreground">Немає даних.</div>
  }
  return (
    <div className="grid gap-3">
      {items.map((x, i) => (
        <Card key={i}>
          <CardHeader className="py-3">
            <CardTitle className="text-base">{x.name}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {x.issues?.length ? (
              <div>
                <div className="text-sm font-semibold mb-1">Проблеми</div>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  {x.issues.map((it, idx) => <li key={idx}>{it}</li>)}
                </ul>
              </div>
            ) : null}
            {x.recommendations?.length ? (
              <div>
                <div className="text-sm font-semibold mb-1">Рекомендації</div>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  {x.recommendations.map((it, idx) => <li key={idx}>{it}</li>)}
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

function BodyInsightList({
  items,
}: {
  items: Array<{ key: string; issues: string[]; recommendations: string[]; exampleCommands: string[] }>
}) {
  if (!items || items.length === 0) {
    return <div className="text-sm text-muted-foreground">Немає даних.</div>
  }
  return (
    <div className="grid gap-3">
      {items.map((x, i) => (
        <Card key={i}>
          <CardHeader className="py-3">
            <CardTitle className="text-base">{x.key}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {x.issues?.length ? (
              <div>
                <div className="text-sm font-semibold mb-1">Проблеми</div>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  {x.issues.map((it, idx) => <li key={idx}>{it}</li>)}
                </ul>
              </div>
            ) : null}
            {x.recommendations?.length ? (
              <div>
                <div className="text-sm font-semibold mb-1">Рекомендації</div>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  {x.recommendations.map((it, idx) => <li key={idx}>{it}</li>)}
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
