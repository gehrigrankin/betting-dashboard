"use client"

import { TrendChart } from "@/components/dashboard/trend-chart"
import type { ResolvedDashboardWidget } from "@/lib/dashboard-widgets"

type DynamicWidgetCardProps = {
  widget: ResolvedDashboardWidget
}

const toneClasses = {
  up: "text-primary",
  down: "text-muted-foreground",
  neutral: "text-muted-foreground",
}

export function DynamicWidgetCard({ widget }: DynamicWidgetCardProps) {
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
          <p className="text-2xl font-semibold tracking-tight">{widget.statValue}</p>
          <p className={`text-sm ${toneClasses[widget.deltaTone]}`}>{widget.delta}</p>
        </div>
      </div>

      {(widget.viewType === "trend" || widget.viewType === "stat" || widget.viewType === "comparison") &&
      "trend" in widget &&
      widget.trend.length > 0 ? (
        <div className="mt-4 rounded-2xl border border-white/6 bg-white/[0.03] p-3">
          <TrendChart data={widget.trend} />
        </div>
      ) : null}

      {widget.viewType === "comparison" ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="glass-chip rounded-xl px-3 py-3">
            <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Primary</p>
            <p className="mt-1 text-lg font-semibold">{widget.statValue}</p>
          </div>
          <div className="glass-chip rounded-xl px-3 py-3">
            <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
              {widget.secondaryLabel}
            </p>
            <p className="mt-1 text-lg font-semibold">{widget.secondaryValue}</p>
          </div>
        </div>
      ) : null}

      {widget.viewType === "table" ? (
        <div className="mt-4 overflow-hidden rounded-2xl border border-white/6 bg-white/[0.03]">
          <div
            className="grid gap-px bg-white/6 text-xs uppercase tracking-[0.12em] text-muted-foreground"
            style={{ gridTemplateColumns: `repeat(${widget.columns.length}, minmax(0, 1fr))` }}
          >
            {widget.columns.map((column) => (
              <div key={column} className="bg-background/60 px-3 py-2">
                {column}
              </div>
            ))}
          </div>
          <div className="divide-y divide-white/6">
            {widget.rows.map((row, rowIndex) => (
              <div
                key={`${widget.id}-${rowIndex}`}
                className="grid gap-px"
                style={{ gridTemplateColumns: `repeat(${row.length}, minmax(0, 1fr))` }}
              >
                {row.map((cell, cellIndex) => (
                  <div
                    key={`${widget.id}-${rowIndex}-${cellIndex}`}
                    className="px-3 py-2 text-sm text-foreground/80"
                  >
                    {cell}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {widget.bullets.length > 0 ? (
        <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
          {widget.bullets.map((bullet) => (
            <li key={bullet} className="glass-chip rounded-xl px-3 py-2">
              {bullet}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
