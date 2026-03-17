"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useRef, useState } from "react"
import { Copy, MoreHorizontal, Pencil, Archive } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { StoredDashboard } from "@/lib/dashboard-builder"

function formatSavedTime(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso))
}

type DashboardListCardProps = {
  dashboard: StoredDashboard
}

export function DashboardListCard({ dashboard }: DashboardListCardProps) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [editName, setEditName] = useState(dashboard.name)
  const [isArchiving, setIsArchiving] = useState(false)
  const [isDuplicating, setIsDuplicating] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const renameInputRef = useRef<HTMLInputElement>(null)

  const closeMenu = useCallback(() => setMenuOpen(false), [])

  const handleRename = useCallback(async () => {
    const raw = renameInputRef.current?.value?.trim() ?? editName.trim()
    const name = raw || dashboard.name
    setRenaming(false)
    if (name === dashboard.name) return
    try {
      const res = await fetch(`/api/dashboards/${dashboard.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })
      if (res.ok) {
        setEditName(name)
        router.refresh()
      }
    } catch {
      setEditName(dashboard.name)
    }
  }, [dashboard.id, dashboard.name, editName, router])

  const handleArchive = useCallback(async () => {
    closeMenu()
    setIsArchiving(true)
    try {
      const res = await fetch(`/api/dashboards/${dashboard.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isArchived: true }),
      })
      if (res.ok) router.refresh()
    } finally {
      setIsArchiving(false)
    }
  }, [dashboard.id, router])

  const handleDuplicate = useCallback(async () => {
    closeMenu()
    setIsDuplicating(true)
    try {
      const res = await fetch("/api/dashboards/copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId: dashboard.id }),
      })
      if (!res.ok) return
      const data = (await res.json()) as { id: string }
      router.push(`/dashboard/${data.id}`)
      router.refresh()
    } finally {
      setIsDuplicating(false)
    }
  }, [dashboard.id, router])

  return (
    <div className="glass-panel group relative rounded-2xl p-5 transition hover:-translate-y-0.5 hover:border-primary/30 hover:bg-white/7">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {renaming ? (
            <input
              ref={renameInputRef}
              autoFocus
              className="field-surface w-full rounded-lg px-2 py-1 text-xl font-semibold"
              defaultValue={editName}
              onBlur={() => void handleRename()}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleRename()
                if (e.key === "Escape") {
                  setEditName(dashboard.name)
                  setRenaming(false)
                }
              }}
            />
          ) : (
            <Link
              href={`/dashboard/${dashboard.id}`}
              className="block focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2 focus:ring-offset-background rounded"
            >
              <p className="text-sm font-medium text-primary">
                {dashboard.scope?.entityName || dashboard.templateName}
              </p>
              <h3 className="mt-1 text-xl font-semibold tracking-tight">
                {dashboard.name}
              </h3>
            </Link>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {formatSavedTime(dashboard.updatedAt)}
          </span>
          <div className="relative" ref={menuRef}>
            <Button
              aria-expanded={menuOpen}
              aria-haspopup="true"
              className="h-8 w-8 rounded-lg p-0 opacity-70 hover:opacity-100"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setMenuOpen((o) => !o)
              }}
              type="button"
              variant="ghost"
            >
              <MoreHorizontal className="size-4" />
            </Button>
            {menuOpen ? (
              <>
                <div
                  className="fixed inset-0 z-10"
                  aria-hidden
                  onClick={closeMenu}
                />
                <div className="glass-panel absolute right-0 top-full z-20 mt-1 min-w-[160px] rounded-xl border border-border py-1 shadow-xl">
                  <button
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-white/5"
                    onClick={(e) => {
                      e.preventDefault()
                      setRenaming(true)
                      closeMenu()
                    }}
                    type="button"
                  >
                    <Pencil className="size-4" />
                    Rename
                  </button>
                  <button
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-white/5"
                    disabled={isDuplicating}
                    onClick={(e) => {
                      e.preventDefault()
                      void handleDuplicate()
                    }}
                    type="button"
                  >
                    <Copy className="size-4" />
                    {isDuplicating ? "Copying…" : "Duplicate"}
                  </button>
                  <button
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-muted-foreground hover:bg-white/5 hover:text-foreground"
                    disabled={isArchiving}
                    onClick={(e) => {
                      e.preventDefault()
                      void handleArchive()
                    }}
                    type="button"
                  >
                    <Archive className="size-4" />
                    {isArchiving ? "Archiving…" : "Archive"}
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>

      <Link href={`/dashboard/${dashboard.id}`} className="block focus:outline-none focus:ring-0">
        <p className="mt-3 text-sm text-muted-foreground">
          {dashboard.description || "No description added yet."}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="glass-chip rounded-full px-3 py-1 text-xs text-muted-foreground">
            {(dashboard.widgetSpecs.length || dashboard.panels.length)} widgets
          </span>
          {dashboard.scope ? (
            <span className="glass-chip rounded-full px-3 py-1 text-xs text-muted-foreground">
              {dashboard.scope.entityType}
            </span>
          ) : null}
          <span className="glass-chip rounded-full px-3 py-1 text-xs text-muted-foreground">
            Saved board
          </span>
        </div>
      </Link>
    </div>
  )
}
