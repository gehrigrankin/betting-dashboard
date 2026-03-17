"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Bell, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"

type AlertItem = {
  id: string
  dashboardId: string | null
  type: string
  config: Record<string, unknown>
  createdAt: string
}

export function AlertsList() {
  const router = useRouter()
  const [alerts, setAlerts] = useState<AlertItem[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch("/api/alerts")
      .then((res) => (res.ok ? res.json() : { alerts: [] }))
      .then((data: { alerts?: AlertItem[] }) => {
        if (!cancelled) {
          setAlerts(data.alerts ?? [])
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function remove(id: string) {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/alerts/${id}`, { method: "DELETE" })
      if (res.ok) {
        setAlerts((prev) => prev.filter((a) => a.id !== id))
        router.refresh()
      }
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    return (
      <div className="glass-panel rounded-2xl p-6">
        <p className="text-sm text-muted-foreground">Loading alerts…</p>
      </div>
    )
  }

  if (alerts.length === 0) {
    return (
      <div className="glass-panel rounded-2xl border-dashed p-6 text-center">
        <Bell className="mx-auto size-8 text-muted-foreground/60" />
        <p className="mt-2 text-sm font-medium">No alerts yet</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Open a dashboard and use &quot;Notify when line moves&quot; to add one.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className="glass-panel flex items-center justify-between gap-4 rounded-xl px-4 py-3"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {alert.type === "line_move"
                ? "Notify when line moves"
                : alert.type}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {alert.dashboardId ? (
                <Link
                  href={`/dashboard/${alert.dashboardId}`}
                  className="hover:underline"
                >
                  Dashboard
                </Link>
              ) : (
                "General"
              )}
              {" · "}
              {new Date(alert.createdAt).toLocaleDateString()}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            disabled={deletingId === alert.id}
            onClick={() => void remove(alert.id)}
            type="button"
            aria-label="Remove alert"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ))}
    </div>
  )
}
