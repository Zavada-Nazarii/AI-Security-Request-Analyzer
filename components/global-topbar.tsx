"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog"
import { ExternalLink } from 'lucide-react'

export function GlobalTopbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur">
      <div className="container mx-auto flex h-12 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Link href="/">
            <Button variant="ghost" size="sm" aria-label="Перейти на головну сторінку">
              Головна
            </Button>
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">Про проєкт</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Про проєкт</DialogTitle>
                <DialogDescription>
                  Інформація про автора та посилання.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <div className="text-sm">
                  <span className="font-medium">Автор:</span> Завада Назарій
                </div>
                <div className="text-sm">
                  <span className="font-medium">LinkedIn: </span>
                  <a
                    href="https://www.linkedin.com/in/zavada-nazarii"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                    aria-label="Відкрити LinkedIn профіль автора у новій вкладці"
                  >
                    www.linkedin.com/in/zavada-nazarii
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </header>
  )
}
