import { TrendChart } from "@/components/dashboard/trend-chart"
import type { DashboardWidget } from "@/lib/dashboard-widgets"

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
    <section className="glass-panel rounded-2xl p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm font-medium text-primary">{widget.title}</p>
          <p className="text-sm text-muted-foreground">{widget.subtitle}</p>
        </div>
        <div className="glass-chip rounded-2xl px-4 py-3 text-right">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            {widget.statLabel}
          </p>
          <p className="text-2xl font-semibold tracking-tight">
            {widget.statValue}
          </p>
          <p className={`text-sm ${toneClasses[widget.deltaTone]}`}>{widget.delta}</p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-white/6 bg-white/[0.03] p-3">
        <TrendChart data={widget.trend} />
      </div>

      <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
        {widget.bullets.map((bullet) => (
          <li key={bullet} className="glass-chip rounded-xl px-3 py-2">
            {bullet}
          </li>
        ))}
      </ul>
    </section>
  )
}
