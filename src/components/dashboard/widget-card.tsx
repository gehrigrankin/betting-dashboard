import { TrendChart } from "@/components/dashboard/trend-chart"
import type { DashboardWidget } from "@/lib/mock-dashboards"

type WidgetCardProps = {
  widget: DashboardWidget
}

const toneClasses = {
  up: "text-primary",
  down: "text-muted-foreground",
  neutral: "text-muted-foreground",
}

export function WidgetCard({ widget }: WidgetCardProps) {
  return (
    <section className="rounded-lg border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm font-medium text-primary">{widget.title}</p>
          <p className="text-sm text-muted-foreground">{widget.subtitle}</p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            {widget.statLabel}
          </p>
          <p className="text-2xl font-semibold tracking-tight">
            {widget.statValue}
          </p>
          <p className={`text-sm ${toneClasses[widget.deltaTone]}`}>{widget.delta}</p>
        </div>
      </div>

      <div className="mt-4">
        <TrendChart data={widget.trend} />
      </div>

      <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
        {widget.bullets.map((bullet) => (
          <li key={bullet} className="rounded-md bg-muted/60 px-3 py-2">
            {bullet}
          </li>
        ))}
      </ul>
    </section>
  )
}
