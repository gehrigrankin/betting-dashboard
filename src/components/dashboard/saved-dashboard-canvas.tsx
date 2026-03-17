import type { StoredDashboard } from "@/lib/dashboard-builder"

export function SavedDashboardCanvas({
  dashboard,
}: {
  dashboard: StoredDashboard
}) {
  const layoutById = new Map(dashboard.layout.map((item) => [item.i, item]))

  return (
    <section className="p-1">
      <div
        className="grid gap-4 rounded-lg bg-transparent p-4"
        style={{
          gridTemplateColumns: "repeat(14, minmax(0, 1fr))",
          gridAutoRows: "62px",
        }}
      >
        {dashboard.panels.map((panel) => {
          const layout = layoutById.get(panel.id)

          if (!layout) {
            return null
          }

          return (
            <article
              key={panel.id}
              className="glass-panel overflow-hidden rounded-2xl p-4"
              style={{
                gridColumn: `${layout.x + 1} / span ${layout.w}`,
                gridRow: `${layout.y + 1} / span ${layout.h}`,
              }}
            >
              <div className="flex h-full flex-col justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                    {panel.kind.replace("-", " ")}
                  </p>
                  <h2 className="mt-2 text-lg font-semibold tracking-tight text-foreground">
                    {panel.title || "Untitled panel"}
                  </h2>
                  {panel.description ? (
                    <p className="mt-2 text-sm text-foreground/70">
                      {panel.description}
                    </p>
                  ) : null}
                </div>

                {panel.kind === "metric" ? (
                  <div>
                    <p className="text-3xl font-semibold tracking-tight text-foreground">
                      {panel.value || "--"}
                    </p>
                    {panel.notes[0] ? (
                      <p className="mt-1 text-sm text-foreground/70">{panel.notes[0]}</p>
                    ) : null}
                  </div>
                ) : null}

                {panel.kind === "note" ? (
                  <div className="glass-chip rounded-xl px-3 py-2 text-sm text-foreground/80">
                    {panel.notes[0] || "No note added yet."}
                  </div>
                ) : null}

                {panel.kind === "checklist" ? (
                  <div className="space-y-2">
                    {(panel.notes.length > 0 ? panel.notes : ["No checklist items yet."])
                      .slice(0, 4)
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
          )
        })}
      </div>
    </section>
  )
}
