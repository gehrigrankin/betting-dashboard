"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { Select } from "@base-ui/react/select"
import GridLayout, { useContainerWidth } from "react-grid-layout"
import "react-grid-layout/css/styles.css"
import "react-resizable/css/styles.css"
import { Check, ChevronDown, Pencil, Plus, Search, Trash2, Wand2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import type {
  DashboardEntityType,
  DashboardScope,
  DashboardStrategyKey,
  GridItemLayout,
  StoredDashboard,
} from "@/lib/dashboard-builder"
import {
  dashboardStrategyDefinitions,
  getDashboardStrategyDefinition,
  getStrategyForTemplate,
} from "@/lib/dashboard-definitions"
import type { ResolvedDashboardWidget } from "@/lib/dashboard-widgets"
import type { DashboardTemplate } from "@/lib/mock-dashboards"
import type { SportsEntitySearchResult } from "@/lib/sports-provider/types"
import { fetchWithRetry } from "@/lib/fetch-with-retry"
import type { DashboardWidgetSpec, WidgetViewType } from "@/lib/widget-spec"
import { widgetFavorites } from "@/lib/widget-favorites"
import { DynamicWidgetCard } from "@/components/dashboard/dynamic-widget-card"

type DynamicDashboardBuilderProps = {
  template: DashboardTemplate
  initialDashboard?: StoredDashboard
}

type SearchState = {
  query: string
  results: SportsEntitySearchResult[]
  selected: SportsEntitySearchResult | null
  isLoading: boolean
  error: string | null
}

type WidgetDraft = {
  title: string
  prompt: string
  preferredViewType: WidgetViewType | "auto"
  /** Last N games for trend/stat; null = use all games in sample. */
  lastNGames: number | null
  spec: DashboardWidgetSpec | null
  preview: ResolvedDashboardWidget | null
  source: "llm" | "fallback" | null
  isInterpreting: boolean
  isResolving: boolean
  error: string | null
  w: number
  h: number
}

const BUILDER_GRID_COLS = 14
const BUILDER_GRID_ROW_HEIGHT = 62

const entityTypeOptions: Array<{ value: DashboardEntityType; label: string }> = [
  { value: "team", label: "Team" },
  { value: "player", label: "Player" },
]

const strategyOptions = dashboardStrategyDefinitions.map((strategy) => ({
  value: strategy.key,
  label: strategy.name,
}))

const viewTypeOptions: Array<{ value: WidgetViewType | "auto"; label: string }> = [
  { value: "auto", label: "Auto" },
  { value: "stat", label: "Stat card" },
  { value: "trend", label: "Trend chart" },
  { value: "table", label: "Small table" },
  { value: "comparison", label: "Comparison" },
]

type SelectOption<T extends string> = {
  value: T
  label: string
}

function getCurrentSeason() {
  const now = new Date()
  return now.getMonth() >= 6 ? now.getFullYear() + 1 : now.getFullYear()
}

function createWidgetId() {
  return `widget-${Math.random().toString(36).slice(2, 10)}`
}

function createSearchState(selected: SportsEntitySearchResult | null = null): SearchState {
  return {
    query: selected?.name ?? "",
    results: [],
    selected,
    isLoading: false,
    error: null,
  }
}

function getScopeSearchResult(scope: DashboardScope | null): SportsEntitySearchResult | null {
  if (!scope) {
    return null
  }

  return {
    id: scope.entityId,
    entityType: scope.entityType,
    name: scope.entityName,
    subtitle: scope.entitySubtitle,
    teamId: scope.entityType === "player" ? scope.entityTeamId || undefined : scope.entityId,
    teamName: scope.entityType === "player" ? scope.entityTeamName || undefined : scope.entityName,
  }
}

function getOpponentSearchResult(scope: DashboardScope | null): SportsEntitySearchResult | null {
  if (!scope?.opponentId || !scope.opponentName) {
    return null
  }

  return {
    id: scope.opponentId,
    entityType: "team",
    name: scope.opponentName,
    subtitle: "Saved opponent filter",
  }
}

function getNextY(layout: GridItemLayout[]) {
  return layout.reduce((max, item) => Math.max(max, item.y + item.h), 0)
}

const LAST_N_OPTIONS: SelectOption<string>[] = [
  { value: "all", label: "All games" },
  { value: "3", label: "Last 3 games" },
  { value: "5", label: "Last 5 games" },
  { value: "10", label: "Last 10 games" },
  { value: "15", label: "Last 15 games" },
]

function createDraft(spec?: DashboardWidgetSpec, layout?: GridItemLayout): WidgetDraft {
  const lastNGames =
    spec?.filters?.sampleMode === "last_n" && spec?.filters?.sampleSize
      ? spec.filters.sampleSize
      : null
  return {
    title: spec?.title ?? "",
    prompt: spec?.prompt ?? "",
    preferredViewType: spec?.viewType ?? "auto",
    lastNGames,
    spec: spec ?? null,
    preview: null,
    source: null,
    isInterpreting: false,
    isResolving: false,
    error: null,
    w: layout?.w ?? 4,
    h: layout?.h ?? 4,
  }
}

function buildScope(params: {
  strategyKey: DashboardStrategyKey
  entityType: DashboardEntityType
  entity: SportsEntitySearchResult | null
  opponent: SportsEntitySearchResult | null
  season: number
}): DashboardScope | null {
  if (!params.entity) {
    return null
  }

  return {
    sport: "NBA",
    strategyKey: params.strategyKey,
    entityType: params.entityType,
    entityId: params.entity.id,
    entityName: params.entity.name,
    entitySubtitle: params.entity.subtitle,
    entityTeamId: params.entityType === "player" ? params.entity.teamId ?? "" : params.entity.id,
    entityTeamName:
      params.entityType === "player" ? params.entity.teamName ?? "" : params.entity.name,
    opponentId: params.opponent?.id ?? "",
    opponentName: params.opponent?.name ?? "",
    season: params.season,
  }
}

export function DynamicDashboardBuilder({
  template,
  initialDashboard,
}: DynamicDashboardBuilderProps) {
  const router = useRouter()
  const initialScope = initialDashboard?.scope ?? null
  const initialStrategyKey =
    initialScope?.strategyKey ?? template.strategyKey ?? getStrategyForTemplate(template.id)
  const initialEntityType =
    initialScope?.entityType ?? (template.entityTypes.includes("player") ? "player" : "team")
  const { width, containerRef, mounted } = useContainerWidth({
    measureBeforeMount: true,
  })

  const [dashboardName, setDashboardName] = useState(initialDashboard?.name ?? template.name)
  const [dashboardDescription, setDashboardDescription] = useState(
    initialDashboard?.description ?? ""
  )
  const [selectedStrategyKey, setSelectedStrategyKey] =
    useState<DashboardStrategyKey>(initialStrategyKey)
  const [selectedEntityType, setSelectedEntityType] =
    useState<DashboardEntityType>(initialEntityType)
  const [season, setSeason] = useState(initialScope?.season ?? getCurrentSeason())
  const [entitySearch, setEntitySearch] = useState<SearchState>(
    createSearchState(getScopeSearchResult(initialScope))
  )
  const [opponentSearch, setOpponentSearch] = useState<SearchState>(
    createSearchState(getOpponentSearchResult(initialScope))
  )
  const [widgetSpecs, setWidgetSpecs] = useState<DashboardWidgetSpec[]>(
    initialDashboard?.widgetSpecs ?? []
  )
  const [layout, setLayout] = useState<GridItemLayout[]>(initialDashboard?.layout ?? [])
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<WidgetDraft | null>(null)

  const selectedStrategy = getDashboardStrategyDefinition(selectedStrategyKey)
  const currentScope = useMemo(
    () =>
      buildScope({
        strategyKey: selectedStrategyKey,
        entityType: selectedEntityType,
        entity: entitySearch.selected,
        opponent: opponentSearch.selected,
        season,
      }),
    [entitySearch.selected, opponentSearch.selected, season, selectedEntityType, selectedStrategyKey]
  )

  useEffect(() => {
    if (!draft) {
      return
    }

    const { overflow } = document.body.style
    document.body.style.overflow = "hidden"

    return () => {
      document.body.style.overflow = overflow
    }
  }, [draft])

  useEffect(() => {
    if (!draft) {
      return
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault()
        closeDialog()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [draft])

  useEffect(() => {
    if (!selectedStrategy.supportedEntityTypes.includes(selectedEntityType)) {
      setSelectedEntityType(selectedStrategy.supportedEntityTypes[0] ?? "team")
    }
  }, [selectedEntityType, selectedStrategy])

  useEffect(() => {
    setEntitySearch((current) => ({
      ...current,
      selected:
        current.selected?.entityType === selectedEntityType ? current.selected : null,
      results: [],
      error: null,
    }))
  }, [selectedEntityType])

  async function runSearch(
    entityType: DashboardEntityType,
    query: string,
    target: "entity" | "opponent"
  ) {
    const setState = target === "entity" ? setEntitySearch : setOpponentSearch

    setState((current) => ({
      ...current,
      isLoading: true,
      error: null,
      results: [],
    }))

    try {
      const response = await fetchWithRetry(
        `/api/entities/search?type=${entityType}&q=${encodeURIComponent(query.trim())}`,
        undefined,
        { retries: 2 }
      )

      if (!response.ok) {
        throw new Error("Search failed")
      }

      const data = (await response.json()) as {
        results: SportsEntitySearchResult[]
      }

      setState((current) => ({
        ...current,
        isLoading: false,
        results: data.results,
      }))
    } catch {
      setState((current) => ({
        ...current,
        isLoading: false,
        error: "Couldn't load results right now.",
      }))
    }
  }

  function selectSearchResult(
    result: SportsEntitySearchResult,
    target: "entity" | "opponent"
  ) {
    const setState = target === "entity" ? setEntitySearch : setOpponentSearch

    setState((current) => ({
      ...current,
      selected: result,
      query: result.name,
      results: [],
      error: null,
    }))
  }

  async function resolvePreview(spec: DashboardWidgetSpec) {
    if (!currentScope) {
      setDraft((current) =>
        current
          ? {
              ...current,
              preview: null,
            }
          : current
      )
      return
    }

    setDraft((current) =>
      current
        ? {
            ...current,
            isResolving: true,
            error: null,
          }
        : current
    )

    try {
      const response = await fetchWithRetry("/api/widgets/resolve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          scope: currentScope,
          widgetSpecs: [spec],
        }),
      }, { retries: 2 })

      if (!response.ok) {
        throw new Error("Preview failed")
      }

      const data = (await response.json()) as {
        widgets: ResolvedDashboardWidget[]
      }

      setDraft((current) =>
        current
          ? {
              ...current,
              preview: data.widgets[0] ?? null,
              isResolving: false,
            }
          : current
      )
    } catch {
      setDraft((current) =>
        current
          ? {
              ...current,
              isResolving: false,
              error: "Couldn't resolve a live preview right now.",
            }
          : current
      )
    }
  }

  async function interpretDraft() {
    if (!draft || draft.prompt.trim().length < 4) {
      setDraft((current) =>
        current
          ? {
              ...current,
              error: "Write a more specific prompt first.",
            }
          : current
      )
      return
    }

    setDraft((current) =>
      current
        ? {
            ...current,
            isInterpreting: true,
            error: null,
          }
        : current
    )

    try {
      const response = await fetchWithRetry("/api/widgets/interpret", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: draft.prompt,
          entityType: selectedEntityType,
          strategyKey: selectedStrategyKey,
          preferredViewType: draft.preferredViewType === "auto" ? null : draft.preferredViewType,
          defaultOpponentId: opponentSearch.selected?.id ?? "",
          defaultOpponentName: opponentSearch.selected?.name ?? "",
        }),
      }, { retries: 2 })

      if (!response.ok) {
        const error = (await response.json()) as { error?: string }
        throw new Error(error.error ?? "Interpretation failed")
      }

      const data = (await response.json()) as {
        spec: DashboardWidgetSpec
        source: "llm" | "fallback"
      }

      const spec = {
        ...data.spec,
        title: draft.title.trim() || data.spec.title,
      }

      setDraft((current) =>
        current
          ? {
              ...current,
              title: spec.title,
              spec,
              source: data.source,
              isInterpreting: false,
            }
          : current
      )

      await resolvePreview(spec)
    } catch (error) {
      setDraft((current) =>
        current
          ? {
              ...current,
              isInterpreting: false,
              error: error instanceof Error ? error.message : "Interpretation failed.",
            }
          : current
      )
    }
  }

  const [libraryAddingId, setLibraryAddingId] = useState<string | null>(null)

  async function addWidgetFromLibrary(fav: (typeof widgetFavorites)[number]) {
    setLibraryAddingId(fav.id)
    try {
      const response = await fetchWithRetry("/api/widgets/interpret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: fav.prompt,
          entityType: selectedEntityType,
          strategyKey: selectedStrategyKey,
          preferredViewType: null,
          defaultOpponentId: opponentSearch.selected?.id ?? "",
          defaultOpponentName: opponentSearch.selected?.name ?? "",
        }),
      }, { retries: 2 })
      if (!response.ok) {
        const err = (await response.json()) as { error?: string }
        throw new Error(err.error ?? "Interpret failed")
      }
      const data = (await response.json()) as { spec: DashboardWidgetSpec }
      const id = createWidgetId()
      const spec = { ...data.spec, id, title: data.spec.title || fav.label }
      const w = 4
      const h = 4
      setWidgetSpecs((current) => [...current, spec])
      setLayout((current) => [
        ...current,
        { i: id, x: 0, y: getNextY(current), w, h },
      ])
    } catch {
      // Silent fail or could toast
    } finally {
      setLibraryAddingId(null)
    }
  }

  function openNewWidgetDialog(seedPrompt?: string) {
    setEditingId(null)
    setDraft({
      ...createDraft(),
      prompt: seedPrompt ?? "",
    })
  }

  function openEditWidgetDialog(widgetId: string) {
    const widget = widgetSpecs.find((item) => item.id === widgetId)
    const itemLayout = layout.find((item) => item.i === widgetId)

    if (!widget || !itemLayout) {
      return
    }

    setEditingId(widgetId)
    setDraft(createDraft(widget, itemLayout))
  }

  function closeDialog() {
    setEditingId(null)
    setDraft(null)
  }

  function saveWidget() {
    if (!draft?.spec) {
      setDraft((current) =>
        current
          ? {
              ...current,
              error: "Interpret the prompt before saving the widget.",
            }
          : current
      )
      return
    }

    const id = editingId ?? draft.spec.id ?? createWidgetId()
    const nextSpec: DashboardWidgetSpec = {
      ...draft.spec,
      id,
      title: draft.title.trim() || draft.spec.title,
      prompt: draft.prompt.trim(),
      filters: {
        ...draft.spec.filters,
        sampleMode: draft.lastNGames != null ? ("last_n" as const) : ("all" as const),
        sampleSize: draft.lastNGames ?? null,
      },
    }
    const w = Math.min(Math.max(draft.w, 3), 8)
    const h = Math.min(Math.max(draft.h, 3), 7)

    if (editingId) {
      setWidgetSpecs((current) =>
        current.map((widget) => (widget.id === editingId ? nextSpec : widget))
      )
      setLayout((current) =>
        current.map((item) => (item.i === editingId ? { ...item, w, h } : item))
      )
    } else {
      setWidgetSpecs((current) => [...current, nextSpec])
      setLayout((current) => [
        ...current,
        {
          i: id,
          x: 0,
          y: getNextY(current),
          w,
          h,
        },
      ])
    }

    closeDialog()
  }

  function deleteWidget(widgetId: string) {
    setWidgetSpecs((current) => current.filter((widget) => widget.id !== widgetId))
    setLayout((current) => current.filter((item) => item.i !== widgetId))

    if (editingId === widgetId) {
      closeDialog()
    }
  }

  async function saveDashboard() {
    if (!currentScope) {
      setSaveError("Choose a default team or player before saving the board.")
      return
    }

    if (widgetSpecs.length === 0) {
      setSaveError("Add at least one dynamic widget before saving.")
      return
    }

    setIsSaving(true)
    setSaveError(null)

    try {
      const response = await fetch(
        initialDashboard ? `/api/dashboards/${initialDashboard.id}` : "/api/dashboards",
        {
          method: initialDashboard ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: dashboardName.trim() || template.name,
            description: dashboardDescription.trim(),
            templateId: template.id,
            templateName: template.name,
            scope: currentScope,
            widgetSpecs,
            panels: [],
            layout,
          }),
        }
      )

      if (!response.ok) {
        const err = (await response.json()) as { error?: string }
        throw new Error(err.error ?? "Save failed")
      }

      const data = (await response.json()) as { id: string }
      router.push(`/dashboard/${data.id}`)
      router.refresh()
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Couldn't save the dashboard. Try again.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <section className="flex flex-col gap-3">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <label className="min-w-0 space-y-2 text-sm">
            <span className="font-medium">Dashboard name</span>
            <input
              className="field-surface h-11 w-full rounded-xl px-3 py-1.5"
              onChange={(event) => setDashboardName(event.target.value)}
              placeholder="Friday props board"
              value={dashboardName}
            />
          </label>
          <div className="flex shrink-0 flex-wrap gap-2 md:self-end">
            {initialDashboard ? (
              <Link
                href={`/dashboard/${initialDashboard.id}`}
                className="inline-flex h-11 items-center justify-center rounded-lg border border-border px-4 text-sm font-medium transition hover:bg-muted"
              >
                View board
              </Link>
            ) : null}
            <Button
              className="h-11 px-4"
              disabled={isSaving}
              onClick={saveDashboard}
              variant="outline"
            >
              {isSaving
                ? "Saving..."
                : initialDashboard
                  ? "Save dashboard"
                  : "Create dashboard"}
            </Button>
            <Button className="h-11 px-4" onClick={() => openNewWidgetDialog()}>
              <Plus className="size-4" />
              Add dynamic widget
            </Button>
          </div>
        </div>
        <label className="max-w-3xl space-y-2 text-sm">
          <span className="font-medium">Short description</span>
          <input
            className="field-surface h-11 w-full rounded-xl px-3 py-1.5"
            onChange={(event) => setDashboardDescription(event.target.value)}
            placeholder="One selector drives every widget on this board"
            value={dashboardDescription}
          />
        </label>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <label className="space-y-2 text-sm">
          <span className="font-medium">Strategy</span>
          <BuilderSelect
            onChange={(value) => setSelectedStrategyKey(value)}
            options={strategyOptions}
            value={selectedStrategyKey}
          />
        </label>

        <label className="space-y-2 text-sm">
          <span className="font-medium">Entity type</span>
          <BuilderSelect
            onChange={(value) => setSelectedEntityType(value)}
            options={entityTypeOptions}
            value={selectedEntityType}
          />
        </label>

        <label className="space-y-2 text-sm">
          <span className="font-medium">Season</span>
          <input
            className="field-surface h-11 w-full rounded-xl px-3 py-1.5"
            onChange={(event) => setSeason(Number(event.target.value) || getCurrentSeason())}
            type="number"
            value={season}
          />
        </label>
      </section>

      <div className="glass-panel rounded-2xl p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="glass-chip rounded-full px-3 py-1 text-xs text-muted-foreground">
            {selectedStrategy.name}
          </span>
          {selectedStrategy.supportedEntityTypes.map((entityType) => (
            <span
              key={entityType}
              className="glass-chip rounded-full px-3 py-1 text-xs text-muted-foreground"
            >
              {entityType}
            </span>
          ))}
        </div>
        <p className="mt-3 text-sm text-muted-foreground">{selectedStrategy.description}</p>
        <div className="mt-4">
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Widget library (one click)
          </p>
          {(() => {
            const filtered = widgetFavorites.filter((f) =>
              f.entityTypes.includes(selectedEntityType)
            )
            const byCategory = filtered.reduce(
              (acc, fav) => {
                const cat = fav.category ?? "Other"
                if (!acc[cat]) acc[cat] = []
                acc[cat].push(fav)
                return acc
              },
              {} as Record<string, typeof filtered>
            )
            const order = ["Scoring", "Market & angle", "Market & context", "League & roster", "Other"]
            const categories = [
              ...new Set([...order.filter((c) => byCategory[c]?.length), ...Object.keys(byCategory)]),
            ]
            return (
              <div className="space-y-4">
                {categories.map((cat) => (
                  <div key={cat}>
                    <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/80">
                      {cat}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {(byCategory[cat] ?? []).map((fav) => (
                        <button
                          key={fav.id}
                          className="glass-chip flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-muted-foreground transition hover:border-primary/30 hover:text-foreground disabled:opacity-60"
                          disabled={libraryAddingId !== null}
                          onClick={() => void addWidgetFromLibrary(fav)}
                          type="button"
                          title={fav.prompt}
                        >
                          {libraryAddingId === fav.id ? (
                            <span className="size-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          ) : (
                            <Plus className="size-3" />
                          )}
                          {fav.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )
          })()}
        </div>
        {selectedStrategy.starterPrompts?.[selectedEntityType]?.length ? (
          <div className="mt-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Strategy prompts
            </p>
            <div className="flex flex-wrap gap-2">
              {selectedStrategy.starterPrompts[selectedEntityType]?.map((prompt) => (
                <button
                  key={prompt}
                  className="glass-chip rounded-full px-3 py-1.5 text-xs text-muted-foreground transition hover:border-primary/30 hover:text-foreground"
                  onClick={() => openNewWidgetDialog(prompt)}
                  type="button"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="glass-panel rounded-2xl p-5">
          <div className="space-y-2">
            <h2 className="text-base font-semibold tracking-tight">
              Default {selectedEntityType} selector
            </h2>
            <p className="text-sm text-muted-foreground">
              Every saved widget will plug this {selectedEntityType} into its calculations by
              default.
            </p>
          </div>
          <div className="mt-4 flex gap-2">
            <input
              className="field-surface h-11 w-full rounded-xl px-3 py-1.5"
              onChange={(event) =>
                setEntitySearch((current) => ({
                  ...current,
                  query: event.target.value,
                }))
              }
              placeholder={
                selectedEntityType === "team"
                  ? "Search teams like Denver or Lakers"
                  : "Search players like Nikola Jokic"
              }
              value={entitySearch.query}
            />
            <Button
              className="h-11 px-4"
              onClick={() => runSearch(selectedEntityType, entitySearch.query, "entity")}
              type="button"
              variant="outline"
            >
              <Search className="size-4" />
              {entitySearch.isLoading ? "Searching..." : "Search"}
            </Button>
          </div>
          {entitySearch.selected ? (
            <div className="glass-chip mt-4 rounded-2xl p-4">
              <p className="text-sm font-medium text-foreground">{entitySearch.selected.name}</p>
              <p className="text-sm text-muted-foreground">{entitySearch.selected.subtitle}</p>
            </div>
          ) : null}
          {entitySearch.error ? (
            <p className="mt-3 text-sm text-rose-300">{entitySearch.error}</p>
          ) : null}
          {entitySearch.results.length > 0 ? (
            <div className="mt-4 space-y-2">
              {entitySearch.results.map((result) => (
                <button
                  key={result.id}
                  className="field-surface flex w-full items-center justify-between rounded-xl px-3 py-3 text-left"
                  onClick={() => selectSearchResult(result, "entity")}
                  type="button"
                >
                  <span>
                    <span className="block text-sm font-medium">{result.name}</span>
                    <span className="block text-sm text-muted-foreground">
                      {result.subtitle}
                    </span>
                  </span>
                  <span className="text-xs text-muted-foreground">Select</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="glass-panel rounded-2xl p-5">
          <div className="space-y-2">
            <h2 className="text-base font-semibold tracking-tight">Optional opponent filter</h2>
            <p className="text-sm text-muted-foreground">
              Use this when you want widgets to default to a specific matchup context.
            </p>
          </div>
          <div className="mt-4 flex gap-2">
            <input
              className="field-surface h-11 w-full rounded-xl px-3 py-1.5"
              onChange={(event) =>
                setOpponentSearch((current) => ({
                  ...current,
                  query: event.target.value,
                }))
              }
              placeholder="Search opponent team"
              value={opponentSearch.query}
            />
            <Button
              className="h-11 px-4"
              onClick={() => runSearch("team", opponentSearch.query, "opponent")}
              type="button"
              variant="outline"
            >
              <Search className="size-4" />
              {opponentSearch.isLoading ? "Searching..." : "Search"}
            </Button>
          </div>
          {opponentSearch.selected ? (
            <div className="glass-chip mt-4 rounded-2xl p-4">
              <p className="text-sm font-medium text-foreground">{opponentSearch.selected.name}</p>
              <p className="text-sm text-muted-foreground">{opponentSearch.selected.subtitle}</p>
            </div>
          ) : null}
          {opponentSearch.error ? (
            <p className="mt-3 text-sm text-rose-300">{opponentSearch.error}</p>
          ) : null}
          {opponentSearch.results.length > 0 ? (
            <div className="mt-4 space-y-2">
              {opponentSearch.results.map((result) => (
                <button
                  key={result.id}
                  className="field-surface flex w-full items-center justify-between rounded-xl px-3 py-3 text-left"
                  onClick={() => selectSearchResult(result, "opponent")}
                  type="button"
                >
                  <span>
                    <span className="block text-sm font-medium">{result.name}</span>
                    <span className="block text-sm text-muted-foreground">
                      {result.subtitle}
                    </span>
                  </span>
                  <span className="text-xs text-muted-foreground">Select</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      {saveError ? <p className="text-sm text-rose-300">{saveError}</p> : null}

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium">Dynamic widget canvas</h2>
            <p className="text-sm text-muted-foreground">
              Drag, resize, and edit the prompt-backed widgets that will render on the board.
            </p>
          </div>
          <span className="glass-chip rounded-full px-3 py-1 text-xs text-muted-foreground">
            {widgetSpecs.length} widgets
          </span>
        </div>

        <div className="glass-panel rounded-2xl p-3 sm:p-4">
          {widgetSpecs.length > 0 ? (
            <div ref={containerRef} className="w-full overflow-x-auto sm:overflow-visible">
              {mounted ? (
                <GridLayout
                  className="layout"
                  dragConfig={{
                    enabled: true,
                  }}
                  gridConfig={{
                    cols: BUILDER_GRID_COLS,
                    margin: [16, 16],
                    rowHeight: BUILDER_GRID_ROW_HEIGHT,
                  }}
                  layout={layout}
                  onLayoutChange={(nextLayout) => setLayout(nextLayout as GridItemLayout[])}
                  resizeConfig={{
                    enabled: true,
                    handles: ["se"],
                  }}
                  width={width}
                >
                  {widgetSpecs.map((widget) => (
                    <div key={widget.id} className="h-full">
                      <article className="glass-panel h-full rounded-2xl p-4">
                        <div className="flex h-full flex-col justify-between gap-4">
                          <div>
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
                                  {widget.viewType}
                                </p>
                                <h3 className="mt-1 text-lg font-semibold tracking-tight">
                                  {widget.title}
                                </h3>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  className="glass-chip rounded-lg p-2 text-muted-foreground transition hover:text-foreground"
                                  onClick={() => openEditWidgetDialog(widget.id)}
                                  type="button"
                                >
                                  <Pencil className="size-4" />
                                </button>
                                <button
                                  className="glass-chip rounded-lg p-2 text-muted-foreground transition hover:text-foreground"
                                  onClick={() => deleteWidget(widget.id)}
                                  type="button"
                                >
                                  <Trash2 className="size-4" />
                                </button>
                              </div>
                            </div>
                            <p className="mt-3 text-sm text-muted-foreground">{widget.summary}</p>
                          </div>
                          <div className="glass-chip rounded-xl px-3 py-3 text-sm text-foreground/80">
                            {widget.prompt}
                          </div>
                        </div>
                      </article>
                    </div>
                  ))}
                </GridLayout>
              ) : (
                <div className="h-52 rounded-2xl border border-dashed border-white/10" />
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 px-6 py-10 text-center">
              <p className="text-lg font-semibold tracking-tight">No widgets yet</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Add a dynamic widget, type what you want, and save the interpreted result into the
                board.
              </p>
            </div>
          )}
        </div>
      </section>

      {draft ? (
        <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-black/35 p-4">
          <div className="flex min-h-full items-start justify-center py-4 md:items-center">
            <div className="glass-panel max-h-[calc(100vh-2rem)] w-full max-w-4xl overflow-y-auto overscroll-contain rounded-2xl p-6 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-primary">
                    {editingId ? "Edit dynamic widget" : "Create dynamic widget"}
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-tight">
                    Prompt-backed widget builder
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Describe the stat or comparison you want, interpret it into a widget spec, then
                    preview it against the current selector.
                  </p>
                </div>
                <button
                  className="glass-chip rounded-lg p-2 text-muted-foreground transition hover:text-foreground"
                  onClick={closeDialog}
                  type="button"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
                <div className="space-y-4">
                  <label className="space-y-2 text-sm">
                    <span className="font-medium">Widget title</span>
                    <input
                      className="field-surface h-11 w-full rounded-xl px-3 py-1.5"
                      onChange={(event) =>
                        setDraft((current) =>
                          current ? { ...current, title: event.target.value } : current
                        )
                      }
                      placeholder="Away split scoring"
                      value={draft.title}
                    />
                  </label>

                  <label className="space-y-2 text-sm">
                    <span className="font-medium">Prompt</span>
                    <textarea
                      className="field-surface min-h-32 w-full rounded-xl px-3 py-3"
                      onChange={(event) =>
                        setDraft((current) =>
                          current
                            ? {
                                ...current,
                                prompt: event.target.value,
                                spec: null,
                                preview: null,
                                source: null,
                                error: null,
                              }
                            : current
                        )
                      }
                      placeholder="show player points against away teams this season"
                      value={draft.prompt}
                    />
                  </label>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <label className="space-y-2 text-sm">
                      <span className="font-medium">Output hint</span>
                      <BuilderSelect
                        onChange={(value) =>
                          setDraft((current) =>
                            current ? { ...current, preferredViewType: value } : current
                          )
                        }
                        options={viewTypeOptions}
                        value={draft.preferredViewType}
                      />
                    </label>
                    <label className="space-y-2 text-sm">
                      <span className="font-medium">Sample</span>
                      <BuilderSelect
                        onChange={(value) =>
                          setDraft((current) =>
                            current
                              ? {
                                  ...current,
                                  lastNGames:
                                    value === "all" ? null : Math.max(1, parseInt(value, 10)),
                                }
                              : current
                          )
                        }
                        options={LAST_N_OPTIONS}
                        value={draft.lastNGames != null ? String(draft.lastNGames) : "all"}
                      />
                    </label>
                    <label className="space-y-2 text-sm">
                      <span className="font-medium">Width</span>
                      <input
                        className="field-surface h-11 w-full rounded-xl px-3 py-1.5"
                        onChange={(event) =>
                          setDraft((current) =>
                            current
                              ? { ...current, w: Number(event.target.value) || current.w }
                              : current
                          )
                        }
                        type="number"
                        value={draft.w}
                      />
                    </label>
                    <label className="space-y-2 text-sm">
                      <span className="font-medium">Height</span>
                      <input
                        className="field-surface h-11 w-full rounded-xl px-3 py-1.5"
                        onChange={(event) =>
                          setDraft((current) =>
                            current
                              ? { ...current, h: Number(event.target.value) || current.h }
                              : current
                          )
                        }
                        type="number"
                        value={draft.h}
                      />
                    </label>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      className="h-11 px-4"
                      disabled={draft.isInterpreting}
                      onClick={interpretDraft}
                      type="button"
                    >
                      <Wand2 className="size-4" />
                      {draft.isInterpreting ? "Interpreting..." : "Interpret widget"}
                    </Button>
                    <Button onClick={saveWidget} type="button" variant="outline">
                      {editingId ? "Save widget" : "Add widget"}
                    </Button>
                  </div>

                  {draft.error ? <p className="text-sm text-rose-300">{draft.error}</p> : null}
                  {draft.source ? (
                    <p className="text-sm text-muted-foreground">
                      {draft.source === "llm"
                        ? "Interpreted with the AI parser."
                        : "Interpreted with the local fallback parser."}
                    </p>
                  ) : null}
                  {!currentScope ? (
                    <p className="text-sm text-muted-foreground">
                      Choose a default {selectedEntityType} above to unlock live preview data.
                    </p>
                  ) : null}
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold tracking-tight">Live preview</h3>
                    {draft.isResolving || draft.isInterpreting ? (
                      <span className="text-sm text-muted-foreground">
                        {draft.isInterpreting ? "Interpreting..." : "Refreshing..."}
                      </span>
                    ) : null}
                  </div>

                  {draft.isInterpreting || draft.isResolving ? (
                    <div className="glass-panel animate-pulse rounded-2xl p-5">
                      <div className="h-4 w-28 rounded bg-white/10" />
                      <div className="mt-2 h-4 w-full rounded bg-white/6" />
                      <div className="mt-4 h-20 rounded-xl bg-white/6" />
                      <div className="mt-4 flex gap-2">
                        <div className="h-6 w-16 rounded-full bg-white/6" />
                        <div className="h-6 w-20 rounded-full bg-white/6" />
                      </div>
                    </div>
                  ) : draft.preview ? (
                    <DynamicWidgetCard widget={draft.preview} />
                  ) : draft.spec ? (
                    <div className="glass-panel rounded-2xl p-5">
                      <p className="text-sm font-medium text-primary">{draft.spec.title}</p>
                      <p className="mt-2 text-sm text-muted-foreground">{draft.spec.summary}</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className="glass-chip rounded-full px-3 py-1 text-xs text-muted-foreground">
                          {draft.spec.viewType}
                        </span>
                        <span className="glass-chip rounded-full px-3 py-1 text-xs text-muted-foreground">
                          {draft.spec.metric}
                        </span>
                        <span className="glass-chip rounded-full px-3 py-1 text-xs text-muted-foreground">
                          {draft.spec.aggregation}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-white/10 px-6 py-10 text-center">
                      <p className="text-sm text-muted-foreground">
                        Interpret the prompt to see the widget spec and live preview.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

type BuilderSelectProps<T extends string> = {
  value: T
  options: Array<SelectOption<T>>
  onChange: (value: T) => void
}

function BuilderSelect<T extends string>({
  value,
  options,
  onChange,
}: BuilderSelectProps<T>) {
  return (
    <Select.Root
      items={options}
      modal={false}
      onValueChange={(nextValue) => {
        if (nextValue) {
          onChange(nextValue as T)
        }
      }}
      value={value}
    >
      <Select.Trigger className="field-surface flex h-11 w-full items-center justify-between rounded-xl px-3 text-left text-sm text-foreground transition hover:border-white/12 focus-visible:border-ring focus-visible:outline-none">
        <Select.Value className="truncate" />
        <Select.Icon className="pointer-events-none ml-4 pr-1 text-muted-foreground">
          <ChevronDown className="size-4" />
        </Select.Icon>
      </Select.Trigger>

      <Select.Portal>
        <Select.Positioner align="start" className="z-[120]" sideOffset={8}>
          <Select.Popup className="glass-panel z-[120] min-w-[220px] overflow-hidden rounded-2xl p-1 shadow-2xl">
            <Select.List className="space-y-1 outline-none">
              {options.map((option) => (
                <Select.Item
                  key={option.value}
                  className="flex cursor-default items-center justify-between rounded-xl px-3 py-2 text-sm text-foreground outline-none transition data-[highlighted]:bg-white/7"
                  value={option.value}
                >
                  <Select.ItemText>{option.label}</Select.ItemText>
                  <Select.ItemIndicator className="text-primary" keepMounted>
                    <Check className="size-4" />
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  )
}
