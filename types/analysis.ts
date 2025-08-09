export type KV = { key: string; value: string }

export type AIAnalysis = {
  summary: string
  overallRiskScore: number
  severityCounts?: Record<string, number>
  findings: Array<{
    title: string
    severity: "Critical" | "High" | "Medium" | "Low" | "Info"
    description: string
    evidence?: string
    recommendations: string[]
    commands: string[]
    references: string[]
    relatedHeaders: string[]
    relatedParams: string[]
    relatedCookies: string[]
    relatedBodyKeys: string[]
  }>
  httpInsights: {
    headers: Array<{
      name: string
      // New: explanations and standardness
      purpose?: string
      isStandard?: boolean
      issues: string[]
      recommendations: string[]
      exampleCommands: string[]
    }>
    cookies: Array<{
      name: string
      issues: string[]
      recommendations: string[]
      exampleCommands: string[]
    }>
    params: Array<{
      name: string
      issues: string[]
      recommendations: string[]
      exampleCommands: string[]
    }>
    bodyFindings: Array<{
      key: string
      issues: string[]
      recommendations: string[]
      exampleCommands: string[]
    }>
  }
  nextSteps: string[]
}

// Snapshot of the real HTTP response captured by the server when enabled
export type HTTPResponseSnapshot = {
  url: string
  status: number
  statusText: string
  headers: Array<{ name: string; value: string }>
  contentType?: string | null
  contentLength?: number | null
  bodyPreview?: string | null
  fetchedAt: string
}
