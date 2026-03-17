export type WidgetEntityBinding = "shared"

export type WidgetViewType = "stat" | "trend" | "table" | "comparison"

export type WidgetMetric =
  | "points"
  | "rebounds"
  | "assists"
  | "minutes"
  | "pra"
  | "team_points"
  | "margin"
  | "record"
  | "rest_edge"
  | "road_streak"
  | "spread"
  | "total"
  | "moneyline"
  | "prop_line"
  | "recommendation"
  | "static_text"
  | "scoreboard"
  | "standings"
  | "injuries"

export type WidgetAggregation =
  | "average"
  | "sum"
  | "latest"
  | "record"
  | "count"
  | "compare_average"
  | "none"

export type WidgetVenueFilter = "any" | "home" | "away"

export type WidgetTravelFilter = "any" | "away_after_away"

export type WidgetFilters = {
  seasonMode: "selected"
  sampleMode: "all" | "last_n"
  sampleSize: number | null
  subjectVenue: WidgetVenueFilter
  opponentVenue: WidgetVenueFilter
  opponentId: string
  opponentName: string
  travelSpot: WidgetTravelFilter
  completedOnly: boolean
}

export type WidgetComparison = {
  label: string
  aggregation: WidgetAggregation
  filters: WidgetFilters
}

export type WidgetPresentation = {
  statLabel: string
  precision: number
  chartType: "line" | "bar"
  tableLimit: number | null
}

export type LegacyStaticContent = {
  kind: "note" | "metric" | "checklist"
  description: string
  value: string
  tone: "lavender" | "blue" | "yellow" | "orange"
  notes: string[]
}

export type DashboardWidgetSpec = {
  specVersion: 1
  id: string
  title: string
  prompt: string
  summary: string
  entityType: "team" | "player"
  entityBinding: WidgetEntityBinding
  viewType: WidgetViewType
  metric: WidgetMetric
  aggregation: WidgetAggregation
  filters: WidgetFilters
  comparison: WidgetComparison | null
  presentation: WidgetPresentation
  legacyStaticContent: LegacyStaticContent | null
}

type WidgetSpecInput = Partial<DashboardWidgetSpec> & {
  id: string
  prompt: string
  entityType: "team" | "player"
}

const defaultFilters: WidgetFilters = {
  seasonMode: "selected",
  sampleMode: "all",
  sampleSize: null,
  subjectVenue: "any",
  opponentVenue: "any",
  opponentId: "",
  opponentName: "",
  travelSpot: "any",
  completedOnly: true,
}

const defaultPresentation: WidgetPresentation = {
  statLabel: "Value",
  precision: 1,
  chartType: "line",
  tableLimit: 8,
}

export function createWidgetSpec(input: WidgetSpecInput): DashboardWidgetSpec {
  return {
    specVersion: 1,
    id: input.id,
    title: input.title?.trim() || "Untitled widget",
    prompt: input.prompt.trim(),
    summary: input.summary?.trim() || "Dynamic widget generated from the prompt.",
    entityType: input.entityType,
    entityBinding: "shared",
    viewType: input.viewType ?? "stat",
    metric: input.metric ?? (input.entityType === "player" ? "points" : "team_points"),
    aggregation: input.aggregation ?? "average",
    filters: normalizeWidgetFilters(input.filters),
    comparison: normalizeWidgetComparison(input.comparison),
    presentation: normalizeWidgetPresentation(input.presentation),
    legacyStaticContent: normalizeLegacyStaticContent(input.legacyStaticContent),
  }
}

export function normalizeWidgetFilters(value: unknown): WidgetFilters {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ...defaultFilters }
  }

  const filters = value as Record<string, unknown>

  return {
    seasonMode: "selected",
    sampleMode: filters.sampleMode === "last_n" ? "last_n" : "all",
    sampleSize:
      typeof filters.sampleSize === "number" && Number.isFinite(filters.sampleSize)
        ? Math.max(1, Math.round(filters.sampleSize))
        : null,
    subjectVenue:
      filters.subjectVenue === "home" || filters.subjectVenue === "away"
        ? filters.subjectVenue
        : "any",
    opponentVenue:
      filters.opponentVenue === "home" || filters.opponentVenue === "away"
        ? filters.opponentVenue
        : "any",
    opponentId: typeof filters.opponentId === "string" ? filters.opponentId : "",
    opponentName: typeof filters.opponentName === "string" ? filters.opponentName : "",
    travelSpot: filters.travelSpot === "away_after_away" ? "away_after_away" : "any",
    completedOnly: filters.completedOnly !== false,
  }
}

function normalizeWidgetComparison(value: unknown): WidgetComparison | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null
  }

  const comparison = value as Record<string, unknown>

  return {
    label:
      typeof comparison.label === "string" && comparison.label.trim()
        ? comparison.label
        : "Comparison sample",
    aggregation: normalizeAggregation(comparison.aggregation),
    filters: normalizeWidgetFilters(comparison.filters),
  }
}

function normalizeWidgetPresentation(value: unknown): WidgetPresentation {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ...defaultPresentation }
  }

  const presentation = value as Record<string, unknown>

  return {
    statLabel:
      typeof presentation.statLabel === "string" && presentation.statLabel.trim()
        ? presentation.statLabel
        : defaultPresentation.statLabel,
    precision:
      typeof presentation.precision === "number" && Number.isFinite(presentation.precision)
        ? Math.max(0, Math.min(2, Math.round(presentation.precision)))
        : defaultPresentation.precision,
    chartType: presentation.chartType === "bar" ? "bar" : "line",
    tableLimit:
      typeof presentation.tableLimit === "number" && Number.isFinite(presentation.tableLimit)
        ? Math.max(1, Math.round(presentation.tableLimit))
        : defaultPresentation.tableLimit,
  }
}

function normalizeLegacyStaticContent(value: unknown): LegacyStaticContent | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null
  }

  const content = value as Record<string, unknown>

  return {
    kind:
      content.kind === "metric" || content.kind === "checklist" ? content.kind : "note",
    description: typeof content.description === "string" ? content.description : "",
    value: typeof content.value === "string" ? content.value : "",
    tone:
      content.tone === "lavender" ||
      content.tone === "blue" ||
      content.tone === "orange"
        ? content.tone
        : "yellow",
    notes: Array.isArray(content.notes)
      ? content.notes.filter((note): note is string => typeof note === "string")
      : [],
  }
}

function normalizeAggregation(value: unknown): WidgetAggregation {
  switch (value) {
    case "sum":
    case "latest":
    case "record":
    case "count":
    case "compare_average":
    case "none":
      return value
    default:
      return "average"
  }
}

function normalizeMetric(value: unknown, entityType: "team" | "player"): WidgetMetric {
  switch (value) {
    case "points":
    case "rebounds":
    case "assists":
    case "minutes":
    case "pra":
    case "team_points":
    case "margin":
    case "record":
    case "rest_edge":
    case "road_streak":
    case "spread":
    case "total":
    case "moneyline":
    case "prop_line":
    case "recommendation":
    case "static_text":
    case "scoreboard":
    case "standings":
    case "injuries":
      return value
    default:
      return entityType === "player" ? "points" : "team_points"
  }
}

function normalizeViewType(value: unknown): WidgetViewType {
  switch (value) {
    case "trend":
    case "table":
    case "comparison":
      return value
    default:
      return "stat"
  }
}

export function parseWidgetSpec(value: unknown): DashboardWidgetSpec | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null
  }

  const spec = value as Record<string, unknown>

  if (
    spec.specVersion !== 1 ||
    typeof spec.id !== "string" ||
    typeof spec.prompt !== "string" ||
    (spec.entityType !== "team" && spec.entityType !== "player")
  ) {
    return null
  }

  return {
    specVersion: 1,
    id: spec.id,
    title: typeof spec.title === "string" && spec.title.trim() ? spec.title : "Untitled widget",
    prompt: spec.prompt,
    summary: typeof spec.summary === "string" ? spec.summary : "",
    entityType: spec.entityType,
    entityBinding: "shared",
    viewType: normalizeViewType(spec.viewType),
    metric: normalizeMetric(spec.metric, spec.entityType),
    aggregation: normalizeAggregation(spec.aggregation),
    filters: normalizeWidgetFilters(spec.filters),
    comparison: normalizeWidgetComparison(spec.comparison),
    presentation: normalizeWidgetPresentation(spec.presentation),
    legacyStaticContent: normalizeLegacyStaticContent(spec.legacyStaticContent),
  }
}

export function createLegacyStaticWidgetSpec(params: {
  id: string
  title: string
  entityType: "team" | "player"
  description: string
  value: string
  kind: "note" | "metric" | "checklist"
  tone: "lavender" | "blue" | "yellow" | "orange"
  notes: string[]
}) {
  return createWidgetSpec({
    id: params.id,
    prompt: `Legacy widget: ${params.title}`,
    title: params.title,
    summary: "Legacy panel migrated into the new dynamic widget system.",
    entityType: params.entityType,
    viewType:
      params.kind === "metric"
        ? "stat"
        : params.kind === "checklist"
          ? "table"
          : "stat",
    metric: "static_text",
    aggregation: "none",
    legacyStaticContent: {
      kind: params.kind,
      description: params.description,
      value: params.value,
      tone: params.tone,
      notes: params.notes,
    },
    presentation: {
      ...defaultPresentation,
      statLabel: params.kind === "metric" ? "Saved value" : "Saved note",
    },
  })
}
