"use server"

import {
  getSettings as dbGetSettings,
  updateSettings as dbUpdateSettings,
  getUser as dbGetUser,
  setAdminPasswordHash,
} from "./db"
import bcrypt from "bcryptjs"

export async function getSettings() {
  return dbGetSettings()
}

function maskToUndefined(v: FormDataEntryValue | null) {
  const s = (v as string | null) || null
  if (!s) return null
  // if user left the masked "••••" string, treat as unchanged -> undefined
  if (s.startsWith("•")) return undefined as any
  return s
}

export async function updateSettingsAction(formData: FormData) {
  const provider = ((formData.get("provider") as string) || "xai") as "xai" | "openai"
  const model = (formData.get("model") as string) || null

  const xai_api_key = maskToUndefined(formData.get("xai_api_key"))
  const openai_api_key = maskToUndefined(formData.get("openai_api_key"))
  const session_secret = maskToUndefined(formData.get("session_secret"))

  await dbUpdateSettings({
    provider,
    model,
    xai_api_key: xai_api_key as any,
    openai_api_key: openai_api_key as any,
    session_secret: session_secret as any,
  })
}

export async function getUser(username: string) {
  return dbGetUser(username)
}

export async function changePasswordAction(formData: FormData) {
  const current = (formData.get("current_password") as string) || ""
  const next = (formData.get("new_password") as string) || ""
  const user = await dbGetUser("admin")
  if (!user) throw new Error("User not found")
  const ok = await bcrypt.compare(current, user.password_hash).catch(() => false)
  if (!ok) {
    throw new Error("Невірний поточний пароль")
  }
  const hash = await bcrypt.hash(next, 10)
  await setAdminPasswordHash(hash)
}
