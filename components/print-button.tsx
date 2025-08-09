"use client"

import { Button } from "@/components/ui/button"

export function PrintButton({ label = "Друк / PDF" }: { label?: string }) {
  return (
    <Button
      type="button"
      onClick={() => {
        if (typeof window !== "undefined") {
          window.print()
        }
      }}
    >
      {label}
    </Button>
  )
}
