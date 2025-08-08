"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Trash } from 'lucide-react'

export function DeleteReportButton({
  id,
  redirectTo,
  size = "sm",
  variant = "destructive",
  children,
}: {
  id: number
  redirectTo?: string
  size?: "sm" | "default"
  variant?: "destructive" | "outline" | "default" | "secondary" | "ghost" | "link"
  children?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function onDelete() {
    try {
      setLoading(true)
      const res = await fetch(`/api/reports/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const t = await res.text()
        throw new Error(t || "Не вдалося видалити звіт")
      }
      if (redirectTo) {
        router.push(redirectTo)
      } else {
        // best-effort refresh
        router.refresh?.()
        if (typeof window !== "undefined") window.location.reload()
      }
    } catch (e) {
      alert((e as any)?.message || "Помилка видалення")
    } finally {
      setLoading(false)
      setOpen(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant={variant as any} size={size} disabled={loading}>
          <Trash className="w-4 h-4 mr-2" />
          {children ?? "Видалити"}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Видалити звіт #{id}?</AlertDialogTitle>
          <AlertDialogDescription>
            Цю дію неможливо скасувати. Звіт буде остаточно видалений.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Скасувати</AlertDialogCancel>
          <AlertDialogAction onClick={onDelete} disabled={loading} className="bg-red-600 hover:bg-red-700">
            Підтвердити
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
