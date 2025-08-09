"use client"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <main className="min-h-[100dvh] grid place-items-center p-6">
          <div className="max-w-lg w-full space-y-4">
            <h1 className="text-2xl font-bold">Сталася помилка</h1>
            <p className="text-sm text-muted-foreground">
              Вибачте, щось пішло не так під час відображення сторінки. Ви можете спробувати повторити дію.
            </p>
            {error?.digest && (
              <div className="text-xs text-muted-foreground">
                Технічні деталі (digest): {error.digest}
              </div>
            )}
            <button
              onClick={() => reset()}
              className="inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm"
            >
              Спробувати знову
            </button>
          </div>
        </main>
      </body>
    </html>
  )
}
