"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Bell, Bookmark, ChevronDown, RefreshCw, Search, Share2, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CopyDashboardButton } from "@/components/dashboard/copy-dashboard-button"
import { fetchWithRetry } from "@/lib/fetch-with-retry"
import { DynamicWidgetGrid } from "@/components/dashboard/dynamic-widget-grid"
import type { DashboardScope, StoredDashboard } from "@/lib/dashboard-builder"
import type { ResolvedWidgetResult } from "@/lib/dashboard-widgets"
import type { SportsEntitySearchResult } from "@/lib/sports-provider/types"

type DashboardBoardViewProps = {
  dashboard: StoredDashboard
  initialResults: ResolvedWidgetResult[]
  readOnly?: boolean
}

type SearchState = {
  query: string
  results: SportsEntitySearchResult[]
  selected: SportsEntitySearchResult | null
  isLoading: boolean
  error: string | null
}

function createSearchState(scope: DashboardScope | null): SearchState {
  return {
    query: scope?.entityName ?? "",
    results: [],
    selected: scope
      ? {
          id: scope.entityId,
          entityType: scope.entityType,
          name: scope.entityName,
          subtitle: scope.entitySubtitle,
          teamId: scope.entityTeamId || undefined,
          teamName: scope.entityTeamName || undefined,
        }
      : null,
    isLoading: false,
    error: null,
  }
}

function buildScope(
  baseScope: DashboardScope | null,
  entity: SportsEntitySearchResult | null,
  season: number
): DashboardScope | null {
  if (!baseScope || !entity) {
    return baseScope
  }

  return {
    ...baseScope,
    entityId: entity.id,
    entityName: entity.name,
    entitySubtitle: entity.subtitle,
    entityTeamId: baseScope.entityType === "player" ? entity.teamId ?? "" : entity.id,
    entityTeamName: baseScope.entityType === "player" ? entity.teamName ?? "" : entity.name,
    season,
  }
}

export function DashboardBoardView({
  dashboard,
  initialResults,
  readOnly = false,
}: DashboardBoardViewProps) {
  const router = useRouter()
  const initialScope = dashboard.scope
  const [results, setResults] = useState(initialResults)
  const [isTemplate, setIsTemplate] = useState(dashboard.isTemplate ?? false)
  const [isTogglingTemplate, setIsTogglingTemplate] = useState(false)
  const [scope, setScope] = useState(initialScope)
  const [season, setSeason] = useState(initialScope?.season ?? new Date().getFullYear())
  const [entitySearch, setEntitySearch] = useState<SearchState>(createSearchState(initialScope))
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [resolveError, setResolveError] = useState<string | null>(null)
  const [lastResolvedAt, setLastResolvedAt] = useState<Date | null>(
    initialResults.length > 0 ? new Date() : null
  )

  const activeScope = useMemo(
    () => buildScope(scope, entitySearch.selected, season),
    [entitySearch.selected, scope, season]
  )

  const [retryTrigger, setRetryTrigger] = useState(0)
  const retryResolve = useCallback(() => {
    setResolveError(null)
    setRetryTrigger((n) => n + 1)
  }, [])

  useEffect(() => {
    if (!activeScope || dashboard.widgetSpecs.length === 0) {
      return
    }
    let cancelled = false

    void (async () => {
      setIsRefreshing(true)
      setResolveError(null)

      try {
        const response = await fetchWithRetry("/api/widgets/resolve", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            scope: activeScope,
            widgetSpecs: dashboard.widgetSpecs,
          }),
        }, { retries: 2 })

        if (!response.ok) {
          throw new Error("Refresh failed")
        }

        const data = (await response.json()) as {
          results: ResolvedWidgetResult[]
        }

        if (!cancelled) {
          setResults(data.results ?? [])
          setScope(activeScope)
          setLastResolvedAt(new Date())
          setIsRefreshing(false)
        }
      } catch {
        if (!cancelled) {
          setResolveError("Couldn't refresh this board with the new selector.")
          setIsRefreshing(false)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [activeScope, dashboard.widgetSpecs, retryTrigger])

  const [shareCopied, setShareCopied] = useState(false)
  const [shareMenuOpen, setShareMenuOpen] = useState(false)
  const [shareRevoked, setShareRevoked] = useState(false)
  const [lineAlertSet, setLineAlertSet] = useState(false)
  const [isAddingLineAlert, setIsAddingLineAlert] = useState(false)
  const shareMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const response = await fetch(`/api/alerts?dashboardId=${dashboard.id}`)
        if (!response.ok) return
        const data = (await response.json()) as {
          alerts?: { type: string }[]
        }
        if (!cancelled) {
          const hasLineAlert = (data.alerts ?? []).some(
            (alert) => alert.type === "line_move"
          )
          if (hasLineAlert) {
            setLineAlertSet(true)
          }
        }
      } catch {
        // silent
      }
    })()
    return () => {
      cancelled = true
    }
  }, [dashboard.id])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (shareMenuRef.current && !shareMenuRef.current.contains(event.target as Node)) {
        setShareMenuOpen(false)
      }
    }
    if (shareMenuOpen) {
      document.addEventListener("click", handleClickOutside)
      return () => document.removeEventListener("click", handleClickOutside)
    }
  }, [shareMenuOpen])

  const handleCopyLink = useCallback(async () => {
    try {
      const response = await fetch(`/api/dashboards/${dashboard.id}/share`, {
        method: "POST",
      })
      if (!response.ok) throw new Error("Share failed")
      const data = (await response.json()) as { shareUrl: string }
      await navigator.clipboard.writeText(data.shareUrl)
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 2000)
    } catch {
      // Silent fail
    }
  }, [dashboard.id])

  const handleRegenerateLink = useCallback(async () => {
    try {
      const response = await fetch(`/api/dashboards/${dashboard.id}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regenerate: true }),
      })
      if (!response.ok) throw new Error("Regenerate failed")
      const data = (await response.json()) as { shareUrl: string }
      await navigator.clipboard.writeText(data.shareUrl)
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 2000)
    } catch {
      // Silent fail
    }
  }, [dashboard.id])

  const handleToggleTemplate = useCallback(async () => {
    setIsTogglingTemplate(true)
    try {
      const res = await fetch(`/api/dashboards/${dashboard.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isTemplate: !isTemplate }),
      })
      if (res.ok) {
        setIsTemplate((prev) => !prev)
        router.refresh()
      }
    } finally {
      setIsTogglingTemplate(false)
    }
  }, [dashboard.id, isTemplate, router])

  const handleRevokeLink = useCallback(async () => {
    try {
      const response = await fetch(`/api/dashboards/${dashboard.id}/share`, {
        method: "DELETE",
      })
      if (!response.ok) throw new Error("Revoke failed")
      setShareRevoked(true)
      setShareMenuOpen(false)
    } catch {
      // Silent fail
    }
  }, [dashboard.id])

  const handleSetLineAlert = useCallback(async () => {
    setIsAddingLineAlert(true)
    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dashboardId: dashboard.id,
          type: "line_move",
          config: { dashboardName: dashboard.name },
        }),
      })
      if (res.ok) setLineAlertSet(true)
    } finally {
      setIsAddingLineAlert(false)
    }
  }, [dashboard.id, dashboard.name])

  async function runSearch() {
    if (!scope || entitySearch.query.trim().length < 2) {
      return
    }

    setEntitySearch((current) => ({
      ...current,
      isLoading: true,
      error: null,
      results: [],
    }))

    try {
      const response = await fetchWithRetry(
        `/api/entities/search?type=${scope.entityType}&q=${encodeURIComponent(entitySearch.query.trim())}`,
        undefined,
        { retries: 2 }
      )

      if (!response.ok) {
        throw new Error("Search failed")
      }

      const data = (await response.json()) as {
        results: SportsEntitySearchResult[]
      }

      setEntitySearch((current) => ({
        ...current,
        isLoading: false,
        results: data.results,
      }))
    } catch {
      setEntitySearch((current) => ({
        ...current,
        isLoading: false,
        error: "Couldn't load selector results right now.",
      }))
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
          <div className="min-w-0 space-y-3">
            <h1 className="text-3xl font-semibold tracking-tight">{dashboard.name}</h1>
            <p className="max-w-3xl text-sm text-muted-foreground">
              {dashboard.description || "No description added yet."}
            </p>
            <div className="flex flex-wrap gap-2">
              {dashboard.scope ? (
                <>
                  <span className="glass-chip rounded-full px-3 py-1 text-xs text-muted-foreground">
                    {dashboard.scope.entityType}
                  </span>
                  <span className="glass-chip rounded-full px-3 py-1 text-xs text-muted-foreground">
                    {dashboard.scope.strategyKey.replace(/_/g, " ")}
                  </span>
                </>
              ) : null}
              <span className="glass-chip rounded-full px-3 py-1 text-xs text-muted-foreground">
                {dashboard.widgetSpecs.length} widgets
              </span>
            </div>
          </div>
          {!readOnly ? (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <div className="relative" ref={shareMenuRef}>
                <Button
                  className="h-9 px-3"
                  onClick={() => setShareMenuOpen((o) => !o)}
                  type="button"
                  variant="outline"
                >
                  <Share2 className="size-4" />
                  {shareCopied ? "Copied!" : "Share"}
                  <ChevronDown
                    className={`ml-1 size-4 transition ${shareMenuOpen ? "rotate-180" : ""}`}
                  />
                </Button>
                {shareMenuOpen ? (
                  <div className="glass-panel absolute right-0 top-full z-20 mt-1 min-w-[180px] rounded-xl p-1 shadow-xl">
                    {shareCopied ? (
                      <p className="px-3 py-2 text-xs text-muted-foreground">
                        Link copied to clipboard
                      </p>
                    ) : null}
                    <button
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-white/5"
                      onClick={handleCopyLink}
                      type="button"
                    >
                      <Share2 className="size-4" />
                      Copy link
                    </button>
                    <button
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-white/5"
                      onClick={handleRegenerateLink}
                      type="button"
                    >
                      <RefreshCw className="size-4" />
                      Regenerate link
                    </button>
                    <button
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-rose-300 hover:bg-white/5"
                      onClick={handleRevokeLink}
                      type="button"
                    >
                      <Trash2 className="size-4" />
                      Revoke link
                    </button>
                  </div>
                ) : null}
              </div>
              <CopyDashboardButton sourceId={dashboard.id} />
              <Button
                className="h-9 gap-1.5 px-3"
                disabled={isTogglingTemplate}
                onClick={() => void handleToggleTemplate()}
                type="button"
                variant={isTemplate ? "secondary" : "outline"}
              >
                <Bookmark
                  className={`size-4 ${isTemplate ? "fill-current" : ""}`}
                />
                {isTemplate ? "Saved as template" : "Save as template"}
              </Button>
              <Button
                className="h-9 gap-1.5 px-3"
                disabled={isAddingLineAlert || lineAlertSet}
                onClick={() => void handleSetLineAlert()}
                type="button"
                variant={lineAlertSet ? "secondary" : "outline"}
              >
                <Bell className={`size-4 ${lineAlertSet ? "fill-current" : ""}`} />
                {lineAlertSet ? "Line alert set" : "Notify when line moves"}
              </Button>
              <Link
                href={`/dashboard/${dashboard.id}/edit`}
                className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
              >
                Edit board
              </Link>
            </div>
          ) : null}
        </header>

        {scope ? (
          <section className="glass-panel rounded-2xl p-4 sm:p-5">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_120px]">
              <div className="space-y-2">
                <p className="text-sm font-medium">Shared selector</p>
                <div className="flex gap-2">
                  <input
                    className="field-surface h-11 w-full rounded-xl px-3 py-1.5"
                    onChange={(event) =>
                      setEntitySearch((current) => ({
                        ...current,
                        query: event.target.value,
                      }))
                    }
                    placeholder={
                      scope.entityType === "team"
                        ? "Switch the board to another team"
                        : "Switch the board to another player"
                    }
                    value={entitySearch.query}
                  />
                  <Button className="h-11 px-4" onClick={runSearch} type="button" variant="outline">
                    <Search className="size-4" />
                    {entitySearch.isLoading ? "Searching..." : "Search"}
                  </Button>
                </div>
                {entitySearch.selected ? (
                  <p className="text-sm text-muted-foreground">
                    Current selection:{" "}
                    <span className="text-foreground">{entitySearch.selected.name}</span>
                  </p>
                ) : null}
                {entitySearch.error ? (
                  <p className="flex items-center gap-2 text-sm text-rose-300">
                    {entitySearch.error}
                    <button
                      className="text-xs underline hover:no-underline"
                      onClick={() => runSearch()}
                      type="button"
                    >
                      Retry
                    </button>
                  </p>
                ) : null}
                {entitySearch.results.length > 0 ? (
                  <div className="mt-2 space-y-2">
                    {entitySearch.results.map((result) => (
                      <button
                        key={result.id}
                        className="field-surface flex w-full items-center justify-between rounded-xl px-3 py-3 text-left"
                        onClick={() =>
                          setEntitySearch((current) => ({
                            ...current,
                            selected: result,
                            query: result.name,
                            results: [],
                            error: null,
                          }))
                        }
                        type="button"
                      >
                        <span>
                          <span className="block text-sm font-medium">{result.name}</span>
                          <span className="block text-sm text-muted-foreground">
                            {result.subtitle}
                          </span>
                        </span>
                        <span className="text-xs text-muted-foreground">Use</span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <label className="space-y-2 text-sm">
                <span className="font-medium">Season</span>
                <input
                  className="field-surface h-11 w-full rounded-xl px-3 py-1.5"
                  onChange={(event) => setSeason(Number(event.target.value) || season)}
                  type="number"
                  value={season}
                />
              </label>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {scope.opponentName ? (
                <span className="glass-chip rounded-full px-3 py-1 text-xs text-muted-foreground">
                  Opponent: {scope.opponentName}
                </span>
              ) : null}
              {lastResolvedAt && !isRefreshing ? (
                <span className="text-xs text-muted-foreground">
                  Data as of {lastResolvedAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} ({Math.max(0, Math.floor((Date.now() - lastResolvedAt.getTime()) / 60_000))} min ago)
                </span>
              ) : null}
              {isRefreshing ? (
                <span className="glass-chip rounded-full px-3 py-1 text-xs text-muted-foreground">
                  Refreshing widgets...
                </span>
              ) : null}
              <Button
                className="h-8 gap-1.5 px-2.5 text-xs"
                disabled={isRefreshing}
                onClick={retryResolve}
                type="button"
                variant="outline"
              >
                <RefreshCw className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
            {resolveError ? (
              <p className="mt-3 flex items-center gap-2 text-sm text-rose-300">
                {resolveError}
                <Button
                  className="h-7 px-2 text-xs"
                  onClick={retryResolve}
                  type="button"
                  variant="outline"
                >
                  Retry
                </Button>
              </p>
            ) : null}
          </section>
        ) : null}

        {!dashboard.scope && dashboard.widgetSpecs.length > 0 ? (
          <div className="glass-panel rounded-2xl border-dashed p-8 text-center">
            <p className="text-lg font-semibold tracking-tight">Set a player or team to load data</p>
            <p className="mt-2 text-sm text-muted-foreground">
              This board has widgets but no player or team is set. Edit the board and pick an entity so we can load stats and charts.
            </p>
            {!readOnly ? (
              <Link
                href={`/dashboard/${dashboard.id}/edit`}
                className="mt-4 inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
              >
                Edit board
              </Link>
            ) : null}
          </div>
        ) : results.length > 0 ? (
          <div className="relative">
            {isRefreshing ? (
              <div
                className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-background/60 backdrop-blur-[2px]"
                aria-label="Refreshing widgets"
              >
                <div className="flex flex-col items-center gap-3">
                  <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <p className="text-sm text-muted-foreground">
                    Updating to {entitySearch.selected?.name ?? "selection"}…
                  </p>
                </div>
              </div>
            ) : null}
            <DynamicWidgetGrid layout={dashboard.layout} results={results} />
          </div>
        ) : (
          <div className="glass-panel rounded-2xl border-dashed p-8 text-center">
            <p className="text-lg font-semibold tracking-tight">No widgets on this board yet</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Add prompt-defined widgets in the builder and they will show up here automatically.
            </p>
            {!readOnly ? (
              <Link
                href={`/dashboard/${dashboard.id}/edit`}
                className="mt-4 inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
              >
                Add widgets
              </Link>
            ) : null}
          </div>
        )}
      </div>
    </main>
  )
}
