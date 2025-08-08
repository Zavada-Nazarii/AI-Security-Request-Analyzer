"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Trash, Plus } from 'lucide-react'
import { useState, useEffect } from "react"

export type KV = { key: string; value: string }

export function KeyValueEditor(props: {
  label: string
  initial?: KV[]
  onChange?: (kv: KV[]) => void
}) {
  const [items, setItems] = useState<KV[]>(props.initial || [{ key: "", value: "" }])

  useEffect(() => {
    props.onChange?.(items.filter((i) => i.key || i.value))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items])

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">{props.label}</div>
      <div className="grid gap-2">
        {items.map((it, idx) => (
          <div key={idx} className="grid grid-cols-[1fr_1fr_auto] gap-2">
            <Input
              placeholder="Ключ"
              value={it.key}
              onChange={(e) => {
                const next = [...items]
                next[idx] = { ...next[idx], key: e.target.value }
                setItems(next)
              }}
            />
            <Input
              placeholder="Значення"
              value={it.value}
              onChange={(e) => {
                const next = [...items]
                next[idx] = { ...next[idx], value: e.target.value }
                setItems(next)
              }}
            />
            <Button
              variant="ghost"
              type="button"
              onClick={() => setItems(items.filter((_, i) => i !== idx))}
              aria-label="Видалити"
            >
              <Trash className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="secondary"
        onClick={() => setItems([...items, { key: "", value: "" }])}
        className="mt-1"
      >
        <Plus className="w-4 h-4 mr-1" /> Додати
      </Button>
    </div>
  )
}
