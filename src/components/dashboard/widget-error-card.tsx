"use client"

import { AlertCircle } from "lucide-react"

type WidgetErrorCardProps = {
  title: string
  error: string
}

export function WidgetErrorCard({ title, error }: WidgetErrorCardProps) {
  return (
    <section className="glass-panel rounded-2xl border border-destructive/20 p-5">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-destructive/10">
          <AlertCircle className="size-4 text-destructive" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    </section>
  )
}
