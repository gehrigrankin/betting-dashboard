export type PanelTone = "lavender" | "blue" | "yellow" | "orange"
export type PanelKind = "note" | "metric" | "checklist"

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

export type StoredDashboard = {
  id: string
  name: string
  description: string
  templateId: string
  templateName: string
  createdAt: string
  updatedAt: string
  panels: DashboardPanel[]
  layout: GridItemLayout[]
}
