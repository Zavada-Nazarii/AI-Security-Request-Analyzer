"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export function LoginForm() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    const res = await fetch("/api/login", { method: "POST", body: formData })
    setLoading(false)
    if (res.ok) {
      window.location.href = "/dashboard"
    } else {
      const txt = await res.text()
      setError(txt || "Помилка входу")
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Вхід</CardTitle>
        <CardDescription>Увійдіть до панелі аналізу безпеки</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-3">
          <Input name="username" placeholder="Логін" defaultValue="admin" />
          <Input name="password" placeholder="Пароль" type="password" defaultValue="admin123!" />
          {error && <div className="text-sm text-red-600">{error}</div>}
          <Button type="submit" disabled={loading}>
            {loading ? "Вхід..." : "Увійти"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
