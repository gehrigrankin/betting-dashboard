import type { DashboardWidgetSpec } from "@/lib/widget-spec"

export type PanelTone = "lavender" | "blue" | "yellow" | "orange"
export type PanelKind = "note" | "metric" | "checklist"
export type DashboardSport = "NBA"
export type DashboardEntityType = "team" | "player"
export type DashboardStrategyKey = "custom" | "away_after_away_fade"

export type DashboardPanel = {
  id: string
  title: string
  description: string
  value: string
  kind: PanelKind
  tone: PanelTone
  notes: string[]
}

export type GridItemLayout = {
  i: string
  x: number
  y: number
  w: number
  h: number
}

export type DashboardScope = {
  sport: DashboardSport
  strategyKey: DashboardStrategyKey
  entityType: DashboardEntityType
  entityId: string
  entityName: string
  entitySubtitle: string
  entityTeamId: string
  entityTeamName: string
  opponentId: string
  opponentName: string
  season: number
}

export type StoredDashboard = {
  id: string
  name: string
  description: string
  templateId: string
  templateName: string
  scope: DashboardScope | null
  shareToken: string | null
  isTemplate: boolean
  createdAt: string
  updatedAt: string
  panels: DashboardPanel[]
  widgetSpecs: DashboardWidgetSpec[]
  layout: GridItemLayout[]
}
