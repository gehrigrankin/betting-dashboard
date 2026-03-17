export type TrendPoint = {
  label: string
  value: number
}

export type DashboardWidget = {
  id: string
  title: string
  subtitle: string
  statLabel: string
  statValue: string
  delta: string
  deltaTone: "up" | "down" | "neutral"
  bullets: string[]
  trend: TrendPoint[]
}

export type ResolvedDashboardWidget =
  | {
      id: string
      title: string
      subtitle: string
      viewType: "stat" | "trend"
      statLabel: string
      statValue: string
      delta: string
      deltaTone: "up" | "down" | "neutral"
      bullets: string[]
      trend: TrendPoint[]
    }
  | {
      id: string
      title: string
      subtitle: string
      viewType: "table"
      statLabel: string
      statValue: string
      delta: string
      deltaTone: "up" | "down" | "neutral"
      bullets: string[]
      columns: string[]
      rows: string[][]
    }
  | {
      id: string
      title: string
      subtitle: string
      viewType: "comparison"
      statLabel: string
      statValue: string
      secondaryLabel: string
      secondaryValue: string
      delta: string
      deltaTone: "up" | "down" | "neutral"
      bullets: string[]
      trend: TrendPoint[]
    }

export type DynamicDashboardView = {
  title: string
  summary: string
  tags: string[]
  widgets: DashboardWidget[]
}

export type ResolvedWidgetResult =
  | { ok: true; widget: ResolvedDashboardWidget }
  | { ok: false; id: string; title: string; error: string }
