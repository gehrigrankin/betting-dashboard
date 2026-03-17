"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function DashboardDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-6">
      <div className="max-w-md space-y-2 text-center">
        <h1 className="text-xl font-semibold tracking-tight">Something went wrong</h1>
        <p className="text-sm text-muted-foreground">
          We couldn’t load this dashboard. It might be missing or there was a temporary error.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button onClick={reset} variant="default">
          Try again
        </Button>
        <Link
          href="/dashboard"
          className="inline-flex h-9 items-center justify-center rounded-lg border border-input bg-background px-4 text-sm font-medium transition hover:bg-accent"
        >
          Back to dashboards
        </Link>
      </div>
    </main>
  )
}
