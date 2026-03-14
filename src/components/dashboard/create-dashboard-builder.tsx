"use client"

import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import { Select } from "@base-ui/react/select"
import GridLayout, { useContainerWidth } from "react-grid-layout"
import "react-grid-layout/css/styles.css"
import "react-resizable/css/styles.css"
import { Check, ChevronDown, GripHorizontal, Pencil, Plus, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import type {
  DashboardPanel,
  GridItemLayout,
  PanelKind,
  PanelTone,
  StoredDashboard,
} from "@/lib/dashboard-builder"
import type { DashboardTemplate } from "@/lib/mock-dashboards"

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

const BUILDER_GRID_COLS = 14
const BUILDER_GRID_GAP = 16
const BUILDER_GRID_ROW_HEIGHT = 62
const PREVIEW_CANVAS_WIDTH = 560

const toneClasses: Record<PanelTone, string> = {
  lavender: "bg-zinc-900 border-zinc-800",
  blue: "bg-zinc-800/90 border-zinc-700",
  yellow: "bg-zinc-900/80 border-zinc-700",
  orange: "bg-rose-950/40 border-rose-800/70",
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

type SelectOption<T extends string> = {
  value: T
  label: string
}

function createPanelId() {
  return `panel-${Math.random().toString(36).slice(2, 10)}`
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
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<PanelDraft | null>(null)

  const selectedPanel = panels.find((panel) => panel.id === editingId) ?? null
  const layoutById = new Map(layout.map((item) => [item.i, item]))

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
    if (panels.length === 0) {
      setSaveError("Add at least one panel before saving.")
      return
    }

    setIsSaving(true)
    setSaveError(null)

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
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-1 flex-col gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="rounded-md bg-muted px-3 py-1 text-xs text-muted-foreground">
              {template.name}
            </span>
            <span className="text-sm text-muted-foreground">
              {panels.length} panels
            </span>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-2 text-sm">
              <span className="font-medium">Dashboard name</span>
              <input
                className="h-11 w-full rounded-xl border bg-background px-3 py-2"
                onChange={(event) => setDashboardName(event.target.value)}
                placeholder="Friday props board"
                value={dashboardName}
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium">Short description</span>
              <input
                className="h-11 w-full rounded-xl border bg-background px-3 py-2"
                onChange={(event) => setDashboardDescription(event.target.value)}
                placeholder="Quick pregame research setup"
                value={dashboardDescription}
              />
            </label>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button disabled={isSaving} onClick={saveDashboard} variant="outline">
            {isSaving ? "Saving..." : initialDashboard ? "Save dashboard" : "Create dashboard"}
          </Button>
          <Button onClick={openNewPanelDialog}>
            <Plus className="size-4" />
            Add panel
          </Button>
        </div>
      </section>
      {saveError ? (
        <p className="text-sm text-rose-300">{saveError}</p>
      ) : null}

      <section className="rounded-xl bg-muted/20 p-1">
        <div ref={containerRef} className="dashboard-grid">
          {mounted && panels.length === 0 ? (
            <div className="flex min-h-[640px] items-center justify-center rounded-lg border border-dashed bg-background/70 p-10 text-center">
              <div className="max-w-md space-y-4">
                <div className="space-y-2">
                  <p className="text-lg font-semibold tracking-tight">
                    Start with your first panel
                  </p>
                  <p className="text-sm text-muted-foreground">
                    This dashboard starts empty. Add a panel, then drag and resize
                    it once you have a few on the board.
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  <Button onClick={openNewPanelDialog}>
                    <Plus className="size-4" />
                    Add panel
                  </Button>
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  {template.widgets.slice(0, 3).map((widget) => (
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-2xl rounded-xl border bg-card p-6 shadow-2xl">
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
                  className="h-11 w-full rounded-xl border bg-background px-3 py-2"
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
                  className="min-h-24 w-full rounded-xl border bg-background px-3 py-2"
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
                  className="h-11 w-full rounded-xl border bg-background px-3 py-2"
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
                  className="h-11 w-full rounded-xl border bg-background px-3 py-2"
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
                  className="h-11 w-full rounded-xl border bg-background px-3 py-2"
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
                  className="min-h-28 w-full rounded-xl border bg-background px-3 py-2"
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
  const previewColumnWidth =
    (PREVIEW_CANVAS_WIDTH - BUILDER_GRID_GAP * (BUILDER_GRID_COLS - 1)) /
    BUILDER_GRID_COLS
  const previewWidth =
    draft.w * previewColumnWidth + (draft.w - 1) * BUILDER_GRID_GAP
  const previewHeight =
    draft.h * BUILDER_GRID_ROW_HEIGHT + (draft.h - 1) * BUILDER_GRID_GAP
  const isCompact = draft.w <= 2 || draft.h <= 2
  const isWide = draft.w >= 5
  const isTall = draft.h >= 4

  return (
    <div className="rounded-lg border border-border/70 bg-background/60 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Live footprint preview
        </p>
        <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
          {draft.w} cols x {draft.h} rows
        </span>
      </div>

      <div
        className="mx-auto rounded-lg border border-dashed border-border/70 bg-background/40 p-3"
        style={{ width: `${PREVIEW_CANVAS_WIDTH}px`, maxWidth: "100%" }}
      >
        <article
          className={`flex max-w-full flex-col overflow-hidden rounded-lg border p-4 shadow-sm transition-all ${toneClasses[draft.tone]}`}
          style={{
            width: `${previewWidth}px`,
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
            <span className="rounded-md bg-background/60 px-2 py-1 text-xs text-muted-foreground">
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
                <div className="rounded-md bg-background/55 px-3 py-2 text-sm text-foreground/80">
                  {primaryNote || "One short note will show here."}
                </div>
                {!isCompact && notes[1] ? (
                  <div className="rounded-md bg-background/40 px-3 py-2 text-sm text-foreground/70">
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
                      className="rounded-md bg-background/55 px-3 py-2 text-sm text-foreground/80"
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
      <Select.Trigger className="flex h-11 w-full items-center justify-between rounded-xl border border-border bg-background px-3 text-left text-sm text-foreground transition hover:border-muted-foreground/40 focus-visible:border-ring focus-visible:outline-none">
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
          <Select.Popup className="z-[120] min-w-[220px] overflow-hidden rounded-lg border border-border bg-card p-1 shadow-2xl">
            <Select.List className="space-y-1 outline-none">
              {options.map((option) => (
                <Select.Item
                  key={option.value}
                  className="flex cursor-default items-center justify-between rounded-md px-3 py-2 text-sm text-foreground outline-none transition data-[highlighted]:bg-muted"
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
