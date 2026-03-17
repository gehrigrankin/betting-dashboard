"use client"

import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { Select } from "@base-ui/react/select"
import GridLayout, { useContainerWidth } from "react-grid-layout"
import "react-grid-layout/css/styles.css"
import "react-resizable/css/styles.css"
import {
  Check,
  ChevronDown,
  GripHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import type {
  DashboardEntityType,
  DashboardPanel,
  GridItemLayout,
  PanelKind,
  PanelTone,
  DashboardScope,
  DashboardStrategyKey,
  StoredDashboard,
} from "@/lib/dashboard-builder"
import {
  dashboardStrategyDefinitions,
  getDashboardStrategyDefinition,
  getStrategyForTemplate,
} from "@/lib/dashboard-definitions"
import type { DashboardTemplate } from "@/lib/mock-dashboards"
import type { SportsEntitySearchResult } from "@/lib/sports-provider/types"

type PanelDraft = {
  title: string
  description: string
  value: string
  kind: PanelKind
  tone: PanelTone
  notes: string
  w: number
  h: number
}

type CreateDashboardBuilderProps = {
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

const BUILDER_GRID_COLS = 14
const BUILDER_GRID_GAP = 16
const BUILDER_GRID_ROW_HEIGHT = 62

const toneClasses: Record<PanelTone, string> = {
  lavender:
    "border-white/6 bg-[linear-gradient(180deg,rgba(40,42,46,0.98),rgba(17,18,20,0.98))] shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_20px_44px_rgba(0,0,0,0.36)]",
  blue:
    "border-white/6 bg-[linear-gradient(180deg,rgba(38,41,45,0.98),rgba(15,17,20,0.98))] shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_20px_44px_rgba(0,0,0,0.36)]",
  yellow:
    "border-white/6 bg-[linear-gradient(180deg,rgba(42,41,38,0.98),rgba(18,17,15,0.98))] shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_20px_44px_rgba(0,0,0,0.36)]",
  orange:
    "border-white/6 bg-[linear-gradient(180deg,rgba(42,39,40,0.98),rgba(18,16,17,0.98))] shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_20px_44px_rgba(0,0,0,0.36)]",
}

const kindOptions: Array<{ value: PanelKind; label: string }> = [
  { value: "note", label: "Note card" },
  { value: "metric", label: "Metric card" },
  { value: "checklist", label: "Checklist card" },
]

const toneOptions: Array<{ value: PanelTone; label: string }> = [
  { value: "lavender", label: "Lavender" },
  { value: "blue", label: "Blue" },
  { value: "yellow", label: "Yellow" },
  { value: "orange", label: "Orange" },
]

const entityTypeOptions: Array<{ value: DashboardEntityType; label: string }> = [
  { value: "team", label: "Team" },
  { value: "player", label: "Player" },
]

const strategyOptions = dashboardStrategyDefinitions.map((strategy) => ({
  value: strategy.key,
  label: strategy.name,
}))

type SelectOption<T extends string> = {
  value: T
  label: string
}

function createPanelId() {
  return `panel-${Math.random().toString(36).slice(2, 10)}`
}

function getCurrentSeason() {
  const now = new Date()
  return now.getMonth() >= 6 ? now.getFullYear() + 1 : now.getFullYear()
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
    teamId:
      scope.entityType === "player"
        ? scope.entityTeamId || undefined
        : scope.entityId,
    teamName:
      scope.entityType === "player"
        ? scope.entityTeamName || undefined
        : scope.entityName,
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
    subtitle: "Optional opponent filter",
  }
}

function createDraft(
  panel?: DashboardPanel,
  layout?: GridItemLayout,
  title = ""
): PanelDraft {
  return {
    title: panel?.title ?? title,
    description: panel?.description ?? "",
    value: panel?.value ?? "",
    kind: panel?.kind ?? "note",
    tone: panel?.tone ?? "yellow",
    notes: panel?.notes.join("\n") ?? "",
    w: layout?.w ?? 3,
    h: layout?.h ?? 3,
  }
}

function getInitialBuilderState(
  template: DashboardTemplate,
  initialDashboard?: StoredDashboard
) {
  if (initialDashboard) {
    return {
      panels: initialDashboard.panels,
      layout: initialDashboard.layout,
    }
  }

  void template
  return { panels: [] as DashboardPanel[], layout: [] as GridItemLayout[] }
}

function getNextY(layout: GridItemLayout[]) {
  return layout.reduce((max, item) => Math.max(max, item.y + item.h), 0)
}

export function CreateDashboardBuilder({
  template,
  initialDashboard,
}: CreateDashboardBuilderProps) {
  const router = useRouter()
  const initialScope = initialDashboard?.scope ?? null
  const initialStrategyKey =
    initialScope?.strategyKey ?? template.strategyKey ?? getStrategyForTemplate(template.id)
  const initialEntityType =
    initialScope?.entityType ??
    (template.entityTypes.includes("player") ? "player" : "team")
  const { width, containerRef, mounted } = useContainerWidth({
    measureBeforeMount: true,
  })
  const initialState = useMemo(
    () => getInitialBuilderState(template, initialDashboard),
    [template, initialDashboard]
  )
  const [panels, setPanels] = useState(initialState.panels)
  const [layout, setLayout] = useState<GridItemLayout[]>(initialState.layout)
  const [dashboardName, setDashboardName] = useState(
    initialDashboard?.name ?? template.name
  )
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
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<PanelDraft | null>(null)

  const selectedPanel = panels.find((panel) => panel.id === editingId) ?? null
  const layoutById = new Map(layout.map((item) => [item.i, item]))
  const selectedStrategy = getDashboardStrategyDefinition(selectedStrategyKey)
  const dynamicWidgets = selectedStrategy.widgetLabels

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
    setEntitySearch((current) => ({
      ...current,
      selected: null,
      results: [],
      error: null,
    }))
  }, [selectedEntityType])

  useEffect(() => {
    if (!selectedStrategy.supportedEntityTypes.includes(selectedEntityType)) {
      setSelectedEntityType(selectedStrategy.supportedEntityTypes[0] ?? "team")
    }
  }, [selectedEntityType, selectedStrategy])

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
      const response = await fetch(
        `/api/entities/search?type=${entityType}&q=${encodeURIComponent(query.trim())}`
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

  function openNewPanelDialog() {
    setEditingId(null)
    setDraft(createDraft())
  }

  function openEditPanelDialog(panelId: string) {
    const panel = panels.find((item) => item.id === panelId)
    const itemLayout = layout.find((item) => item.i === panelId)

    if (!panel || !itemLayout) {
      return
    }

    setEditingId(panelId)
    setDraft(createDraft(panel, itemLayout))
  }

  function closeDialog() {
    setEditingId(null)
    setDraft(null)
  }

  function savePanel() {
    if (!draft) {
      return
    }

    const w = Math.min(Math.max(draft.w, 2), 6)
    const h = Math.min(Math.max(draft.h, 2), 5)
    const notes = draft.notes
      .split("\n")
      .map((note) => note.trim())
      .filter(Boolean)

    if (editingId) {
      setPanels((current) =>
        current.map((panel) =>
          panel.id === editingId
            ? {
                ...panel,
                title: draft.title,
                description: draft.description,
                value: draft.value,
                kind: draft.kind,
                tone: draft.tone,
                notes,
              }
            : panel
        )
      )
      setLayout((current) =>
        current.map((item) =>
          item.i === editingId ? { ...item, w, h } : item
        )
      )
    } else {
      const id = createPanelId()

      setPanels((current) => [
        ...current,
        {
          id,
          title: draft.title,
          description: draft.description,
          value: draft.value,
          kind: draft.kind,
          tone: draft.tone,
          notes,
        },
      ])
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

  function deletePanel(panelId: string) {
    setPanels((current) => current.filter((panel) => panel.id !== panelId))
    setLayout((current) => current.filter((item) => item.i !== panelId))

    if (editingId === panelId) {
      closeDialog()
    }
  }

  async function saveDashboard() {
    const requiresScope = selectedStrategyKey !== "custom"

    if (requiresScope && !entitySearch.selected) {
      setSaveError("Choose a team or player before saving this strategy dashboard.")
      return
    }

    if (!requiresScope && panels.length === 0) {
      setSaveError("Add at least one panel before saving.")
      return
    }

    setIsSaving(true)
    setSaveError(null)

    const scope: DashboardScope | null =
      requiresScope && entitySearch.selected
        ? {
            sport: "NBA",
            strategyKey: selectedStrategyKey,
            entityType: selectedEntityType,
            entityId: entitySearch.selected.id,
            entityName: entitySearch.selected.name,
            entitySubtitle: entitySearch.selected.subtitle,
            entityTeamId:
              selectedEntityType === "player"
                ? entitySearch.selected.teamId ?? ""
                : entitySearch.selected.id,
            entityTeamName:
              selectedEntityType === "player"
                ? entitySearch.selected.teamName ?? ""
                : entitySearch.selected.name,
            opponentId: opponentSearch.selected?.id ?? "",
            opponentName: opponentSearch.selected?.name ?? "",
            season,
          }
        : null

    try {
      const response = await fetch(
        initialDashboard
          ? `/api/dashboards/${initialDashboard.id}`
          : "/api/dashboards",
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
            scope,
            panels,
            layout,
          }),
        }
      )

      if (!response.ok) {
        throw new Error("Save failed")
      }

      const data = (await response.json()) as { id: string }
      router.push(`/dashboard/${data.id}`)
      router.refresh()
    } catch {
      setSaveError("Couldn't save the dashboard. Try again.")
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
            <Button className="h-11 px-4" onClick={openNewPanelDialog}>
              <Plus className="size-4" />
              Add panel
            </Button>
          </div>
        </div>
        <label className="max-w-3xl space-y-2 text-sm">
          <span className="font-medium">Short description</span>
          <input
            className="field-surface h-11 w-full rounded-xl px-3 py-1.5"
            onChange={(event) => setDashboardDescription(event.target.value)}
            placeholder="Quick pregame research setup"
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
        <p className="mt-3 text-sm text-muted-foreground">
          {selectedStrategy.description}
        </p>
      </div>

      {selectedStrategyKey !== "custom" ? (
        <section className="grid gap-4 xl:grid-cols-2">
          <div className="glass-panel rounded-2xl p-5">
            <div className="space-y-2">
              <h2 className="text-base font-semibold tracking-tight">
                Choose the {selectedEntityType}
              </h2>
              <p className="text-sm text-muted-foreground">
                Search for the exact NBA {selectedEntityType} you want this board to follow.
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
            {entitySearch.error ? (
              <p className="mt-3 text-sm text-rose-300">{entitySearch.error}</p>
            ) : null}
            {entitySearch.selected ? (
              <div className="glass-chip mt-4 rounded-2xl p-4">
                <p className="text-sm font-medium text-foreground">
                  {entitySearch.selected.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {entitySearch.selected.subtitle}
                </p>
              </div>
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
              <h2 className="text-base font-semibold tracking-tight">
                Optional opponent filter
              </h2>
              <p className="text-sm text-muted-foreground">
                Narrow the board to a specific opponent if that helps your routine.
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
                <p className="text-sm font-medium text-foreground">
                  {opponentSearch.selected.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {opponentSearch.selected.subtitle}
                </p>
              </div>
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
      ) : null}

      <section className="glass-panel rounded-2xl p-5">
        <div className="space-y-2">
          <h2 className="text-base font-semibold tracking-tight">Core widgets</h2>
          <p className="text-sm text-muted-foreground">
            {selectedStrategyKey === "custom"
              ? "Use these as starter ideas for the manual panels you add to the board."
              : "These are the live widgets this strategy will assemble for the chosen scope."}
          </p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {dynamicWidgets.map((widget) => (
            <span
              key={widget}
              className="glass-chip rounded-full px-3 py-1 text-xs text-muted-foreground"
            >
              {widget}
            </span>
          ))}
        </div>
      </section>

      {saveError ? (
        <p className="text-sm text-rose-300">{saveError}</p>
      ) : null}

      <section className="p-1">
        <div ref={containerRef} className="dashboard-grid">
          {mounted && panels.length === 0 ? (
            <div className="flex min-h-[640px] items-center justify-center rounded-lg border border-dashed bg-background/70 p-10 text-center">
              <div className="max-w-md space-y-4">
                <div className="space-y-2">
                  <p className="text-lg font-semibold tracking-tight">
                    Start with your first panel
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedStrategyKey === "custom"
                      ? "This dashboard starts empty. Add a panel, then drag and resize it once you have a few on the board."
                      : "Live strategy widgets will render after you save the board. Add optional note panels here if you want your own annotations on top."}
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  <Button onClick={openNewPanelDialog}>
                    <Plus className="size-4" />
                    Add note panel
                  </Button>
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  {dynamicWidgets.slice(0, 3).map((widget) => (
                    <button
                      key={widget}
                      type="button"
                      className="rounded-md border bg-card px-3 py-1 text-xs text-muted-foreground transition hover:bg-accent"
                      onClick={() => setDraft(createDraft(undefined, undefined, widget))}
                    >
                      {widget}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
          {mounted && panels.length > 0 ? (
            <GridLayout
              className="layout"
              dragConfig={{
                enabled: true,
                cancel: ".dashboard-panel-action",
                handle: ".dashboard-panel-drag-handle",
              }}
              gridConfig={{
                cols: BUILDER_GRID_COLS,
                margin: [BUILDER_GRID_GAP, BUILDER_GRID_GAP],
                rowHeight: BUILDER_GRID_ROW_HEIGHT,
              }}
              layout={layout}
              onLayoutChange={(nextLayout) =>
                setLayout(nextLayout as GridItemLayout[])
              }
              resizeConfig={{
                enabled: true,
                handles: ["se"],
              }}
              width={width}
            >
              {panels.map((panel) => (
                <div key={panel.id} className="h-full">
                  {(() => {
                    const itemLayout = layoutById.get(panel.id)
                    const isCompact =
                      (itemLayout?.w ?? 3) <= 2 || (itemLayout?.h ?? 3) <= 2
                    const isMedium =
                      (itemLayout?.w ?? 3) <= 3 || (itemLayout?.h ?? 3) <= 3
                    const primaryNote = panel.notes[0] ?? ""

                    return (
                      <article
                        className={`group flex h-full flex-col overflow-hidden rounded-lg border p-4 shadow-sm transition ${toneClasses[panel.tone]}`}
                      >
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <div className="dashboard-panel-drag-handle inline-flex cursor-grab items-center gap-2 rounded-md bg-background/50 px-2 py-1 text-[11px] font-medium text-muted-foreground">
                            <GripHorizontal className="size-3.5" />
                          </div>
                          <div className="dashboard-panel-action flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                            <button
                              type="button"
                              className="inline-flex size-7 items-center justify-center rounded-full bg-background/70 text-foreground transition hover:bg-background"
                              onClick={() => openEditPanelDialog(panel.id)}
                            >
                              <Pencil className="size-4" />
                            </button>
                            <button
                              type="button"
                              className="inline-flex size-7 items-center justify-center rounded-full bg-background/70 text-foreground transition hover:bg-background"
                              onClick={() => deletePanel(panel.id)}
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        </div>

                        <div className="flex min-h-0 flex-1 flex-col justify-between gap-3">
                          <div className="space-y-2">
                            <h3 className="text-base font-semibold tracking-tight">
                              {panel.title}
                            </h3>
                            {!isCompact ? (
                              <p className="max-w-[22ch] text-sm leading-5 text-foreground/70">
                                {panel.description}
                              </p>
                            ) : null}
                          </div>

                          {panel.kind === "metric" ? (
                            <div className="space-y-1">
                              <p
                                className={
                                  isCompact
                                    ? "text-xl font-semibold tracking-tight"
                                    : "text-2xl font-semibold tracking-tight"
                                }
                              >
                                {panel.value || "--"}
                              </p>
                              {!isMedium && primaryNote ? (
                                <p className="max-w-[20ch] text-sm text-foreground/70">
                                  {primaryNote}
                                </p>
                              ) : null}
                            </div>
                          ) : null}

                          {panel.kind === "note" && !isCompact ? (
                            <div className="space-y-2">
                              {primaryNote ? (
                                <p className="max-w-[22ch] rounded-md bg-background/55 px-3 py-2 text-sm text-foreground/80">
                                  {primaryNote}
                                </p>
                              ) : null}
                            </div>
                          ) : null}

                          {panel.kind === "checklist" ? (
                            <div className="space-y-2">
                              <p className="text-sm text-foreground/75">
                                {panel.value || `${panel.notes.length} items`}
                              </p>
                              {!isMedium ? (
                                <p className="max-w-[20ch] text-sm text-foreground/70">
                                  {panel.notes.length} saved notes
                                </p>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      </article>
                    )
                  })()}
                </div>
              ))}
            </GridLayout>
          ) : null}
        </div>
      </section>

      {draft ? (
        <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-black/35 p-4">
          <div className="flex min-h-full items-start justify-center py-4 md:items-center">
            <div className="glass-panel max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto overscroll-contain rounded-2xl p-6 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-primary">
                    {editingId ? "Edit panel" : "Create panel"}
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-tight">
                    {editingId ? selectedPanel?.title ?? "Update panel" : "Add a new panel"}
                  </h2>
                </div>
                <button
                  type="button"
                  className="inline-flex size-9 items-center justify-center rounded-full border bg-background transition hover:bg-accent"
                  onClick={closeDialog}
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="mt-6">
                <p className="mb-2 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  Preview
                </p>
                <DialogPanelPreview draft={draft} />
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm">
                  <span className="font-medium">Title</span>
                  <input
                    className="field-surface h-11 w-full rounded-xl px-3 py-2"
                    onChange={(event) =>
                      setDraft((current) =>
                        current ? { ...current, title: event.target.value } : current
                      )
                    }
                    value={draft.title}
                  />
                </label>

              <label className="space-y-2 text-sm">
                <span className="font-medium">Panel type</span>
                <BuilderSelect
                  onChange={(value) =>
                    setDraft((current) =>
                      current ? { ...current, kind: value } : current
                    )
                  }
                  options={kindOptions}
                  value={draft.kind}
                />
              </label>

              <label className="space-y-2 text-sm md:col-span-2">
                <span className="font-medium">Description</span>
                <textarea
                  className="field-surface min-h-24 w-full rounded-xl px-3 py-2"
                  onChange={(event) =>
                    setDraft((current) =>
                      current
                        ? { ...current, description: event.target.value }
                        : current
                    )
                  }
                  value={draft.description}
                />
              </label>

              <label className="space-y-2 text-sm">
                <span className="font-medium">Metric value</span>
                <input
                  className="field-surface h-11 w-full rounded-xl px-3 py-2"
                  onChange={(event) =>
                    setDraft((current) =>
                      current ? { ...current, value: event.target.value } : current
                    )
                  }
                  placeholder="28.4 PPG"
                  value={draft.value}
                />
              </label>

              <label className="space-y-2 text-sm">
                <span className="font-medium">Color</span>
                <BuilderSelect
                  onChange={(value) =>
                    setDraft((current) =>
                      current ? { ...current, tone: value } : current
                    )
                  }
                  options={toneOptions}
                  value={draft.tone}
                />
              </label>

              <label className="space-y-2 text-sm">
                <span className="font-medium">Width</span>
                <input
                  className="field-surface h-11 w-full rounded-xl px-3 py-2"
                  max={6}
                  min={2}
                  onChange={(event) =>
                    setDraft((current) =>
                      current
                        ? { ...current, w: Number(event.target.value) || 2 }
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
                  className="field-surface h-11 w-full rounded-xl px-3 py-2"
                  max={5}
                  min={2}
                  onChange={(event) =>
                    setDraft((current) =>
                      current
                        ? { ...current, h: Number(event.target.value) || 2 }
                        : current
                    )
                  }
                  type="number"
                  value={draft.h}
                />
              </label>

              <label className="space-y-2 text-sm md:col-span-2">
                <span className="font-medium">Notes or checklist items</span>
                <textarea
                  className="field-surface min-h-28 w-full rounded-xl px-3 py-2"
                  onChange={(event) =>
                    setDraft((current) =>
                      current ? { ...current, notes: event.target.value } : current
                    )
                  }
                  placeholder="One idea per line"
                  value={draft.notes}
                />
              </label>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              {editingId ? (
                <Button
                  onClick={() => deletePanel(editingId)}
                  type="button"
                  variant="destructive"
                >
                  Delete
                </Button>
              ) : null}
              <Button onClick={closeDialog} type="button" variant="outline">
                Cancel
              </Button>
              <Button onClick={savePanel} type="button">
                {editingId ? "Save changes" : "Create panel"}
              </Button>
            </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

function DialogPanelPreview({ draft }: { draft: PanelDraft }) {
  const notes = draft.notes
    .split("\n")
    .map((note) => note.trim())
    .filter(Boolean)
  const primaryNote = notes[0]
  const previewHeight =
    draft.h * BUILDER_GRID_ROW_HEIGHT + (draft.h - 1) * BUILDER_GRID_GAP
  const isCompact = draft.w <= 2 || draft.h <= 2
  const isWide = draft.w >= 5
  const isTall = draft.h >= 4

  return (
    <div className="glass-panel rounded-2xl p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Live footprint preview
        </p>
        <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
          {draft.w} cols x {draft.h} rows
        </span>
      </div>

      <div
        className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-3"
      >
        <article
          className={`flex w-full max-w-full flex-col overflow-hidden rounded-lg border p-4 shadow-sm transition-all ${toneClasses[draft.tone]}`}
          style={{
            minHeight: `${previewHeight}px`,
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                {draft.kind.replace("-", " ")}
              </p>
              <h3
                className={
                  isCompact
                    ? "mt-2 text-base font-semibold tracking-tight text-foreground"
                    : "mt-2 text-lg font-semibold tracking-tight text-foreground"
                }
              >
                {draft.title || "Untitled panel"}
              </h3>
            </div>
            <span className="glass-chip rounded-full px-2 py-1 text-xs text-muted-foreground">
              Preview
            </span>
          </div>

          <div className="mt-4 flex flex-1 flex-col justify-between gap-3">
            {!isCompact ? (
              draft.description ? (
                <p className={`${isWide ? "max-w-[44ch]" : "max-w-[30ch]"} text-sm text-foreground/75`}>
                  {draft.description}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Add a short description to explain the panel.
                </p>
              )
            ) : null}

            {draft.kind === "metric" ? (
              <div className="space-y-1">
                <p
                  className={
                    isCompact
                      ? "text-xl font-semibold tracking-tight text-foreground"
                      : isWide || isTall
                        ? "text-3xl font-semibold tracking-tight text-foreground"
                        : "text-2xl font-semibold tracking-tight text-foreground"
                  }
                >
                  {draft.value || "--"}
                </p>
                {!isCompact && primaryNote ? (
                  <p className="text-sm text-foreground/70">{primaryNote}</p>
                ) : null}
              </div>
            ) : null}

            {draft.kind === "note" ? (
              <div className="space-y-2">
                <div className="glass-chip rounded-xl px-3 py-2 text-sm text-foreground/80">
                  {primaryNote || "One short note will show here."}
                </div>
                {!isCompact && notes[1] ? (
                  <div className="glass-chip rounded-xl px-3 py-2 text-sm text-foreground/70">
                    {notes[1]}
                  </div>
                ) : null}
              </div>
            ) : null}

            {draft.kind === "checklist" ? (
              <div className="space-y-2">
                {(notes.length > 0 ? notes : ["First checklist item"])
                  .slice(0, isTall ? 4 : 3)
                  .map((note) => (
                    <div
                      key={note}
                      className="glass-chip rounded-xl px-3 py-2 text-sm text-foreground/80"
                    >
                      {note}
                    </div>
                  ))}
              </div>
            ) : null}
          </div>
        </article>
      </div>
    </div>
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
        <Select.Positioner
          align="start"
          className="z-[120]"
          sideOffset={8}
        >
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
