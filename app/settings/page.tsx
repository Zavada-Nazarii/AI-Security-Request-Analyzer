import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { verifySession } from "@/lib/auth"
import { getSettings, getUser, updateSettingsAction, changePasswordAction } from "@/lib/settings-actions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { ProviderSelect } from "@/components/provider-select"

export default async function SettingsPage() {
  const cookieStore = await cookies()
  const session = cookieStore.get("session")?.value
  const valid = await verifySession(session || "")
  if (!valid) redirect("/login")

  const settings = await getSettings()
  const user = await getUser("admin")

  const provider = (settings?.provider || "xai") as "xai" | "openai"
  const modelPlaceholder = provider === "openai" ? "gpt-4o" : "grok-3"

  return (
    <main className="container mx-auto p-4 md:p-6 space-y-6">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold">Налаштування</h1>
        <p className="text-muted-foreground">
          Оберіть провайдера ШІ та збережіть відповідний API‑ключ. Якщо у вас ключ від ChatGPT, оберіть OpenAI. Якщо від xAI, оберіть xAI.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Провайдер та ключі</CardTitle>
            <CardDescription>Використовується для аналітики запитів у розділі Дашборд.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={updateSettingsAction} className="grid gap-4">
              <ProviderSelect defaultValue={provider} />

              <div className="grid gap-2">
                <Label htmlFor="model">Модель</Label>
                <Input
                  id="model"
                  name="model"
                  placeholder={modelPlaceholder}
                  defaultValue={settings?.model || ""}
                />
                <p className="text-xs text-muted-foreground">
                  Приклад: для OpenAI — gpt-4o або gpt-4o-mini; для xAI — grok-3.
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="openai_api_key">OPENAI_API_KEY</Label>
                <Input
                  id="openai_api_key"
                  name="openai_api_key"
                  type="password"
                  placeholder="sk-..."
                  defaultValue={settings?.openai_api_key ? "••••••••••••••••" : ""}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="xai_api_key">XAI_API_KEY</Label>
                <Input
                  id="xai_api_key"
                  name="xai_api_key"
                  type="password"
                  placeholder="xai-..."
                  defaultValue={settings?.xai_api_key ? "••••••••••••••••" : ""}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="session_secret">Секрет сесії (необов’язково)</Label>
                <Input
                  id="session_secret"
                  name="session_secret"
                  type="password"
                  placeholder="Вкажіть власний секрет для підпису JWT"
                  defaultValue={settings?.session_secret ? "••••••••••••••••" : ""}
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit">Зберегти</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Зміна пароля</CardTitle>
            <CardDescription>Користувач: {user?.username ?? "admin"}</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={changePasswordAction} className="grid gap-3">
              <Input name="current_password" type="password" placeholder="Поточний пароль" />
              <Input name="new_password" type="password" placeholder="Новий пароль" />
              <Button type="submit">Оновити пароль</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
