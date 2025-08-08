"use client"

import { useState } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"

export function ProviderSelect({ defaultValue = "xai" }: { defaultValue?: "xai" | "openai" }) {
  const [value, setValue] = useState<"xai" | "openai">(defaultValue as any)
  return (
    <div className="grid gap-2">
      <Label htmlFor="provider">Провайдер</Label>
      {/* Hidden input to ensure value is submitted with the form */}
      <input type="hidden" name="provider" value={value} />
      <Select value={value} onValueChange={(v) => setValue(v as any)}>
        <SelectTrigger id="provider">
          <SelectValue placeholder="Оберіть провайдера" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="xai">xAI (Grok)</SelectItem>
          <SelectItem value="openai">OpenAI (ChatGPT)</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
