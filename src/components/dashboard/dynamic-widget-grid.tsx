"use client"

import { useMediaQuery } from "@/hooks/use-media-query"
import type { GridItemLayout } from "@/lib/dashboard-builder"
import type { ResolvedWidgetResult } from "@/lib/dashboard-widgets"
import { DynamicWidgetCard } from "@/components/dashboard/dynamic-widget-card"
import { WidgetErrorCard } from "@/components/dashboard/widget-error-card"

type DynamicWidgetGridProps = {
  results: ResolvedWidgetResult[]
  layout: GridItemLayout[]
}

export function DynamicWidgetGrid({ results, layout }: DynamicWidgetGridProps) {
  const layoutById = new Map(layout.map((item) => [item.i, item]))
  const resultsById = new Map(
    results.map((r) => [r.ok ? r.widget.id : r.id, r])
  )
  const isDesktop = useMediaQuery("(min-width: 768px)")

  return (
    <section className="p-1">
      <div
        className="grid gap-4 rounded-lg bg-transparent p-2 sm:p-4"
        style={{
          gridTemplateColumns: isDesktop ? "repeat(14, minmax(0, 1fr))" : "1fr",
          gridAutoRows: "62px",
        }}
      >
        {layout.map((item) => {
          const result = resultsById.get(item.i)
          if (!result) {
            return null
          }

          return (
            <div
              key={item.i}
              style={
                isDesktop
                  ? {
                      gridColumn: `${item.x + 1} / span ${item.w}`,
                      gridRow: `${item.y + 1} / span ${item.h}`,
                    }
                  : {
                      gridColumn: "1 / -1",
                      gridRow: "auto",
                    }
              }
            >
              {result.ok ? (
                <DynamicWidgetCard widget={result.widget} />
              ) : (
                <WidgetErrorCard title={result.title} error={result.error} />
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
