import Link from "next/link"
import type { DashboardTemplate } from "@/lib/mock-dashboards"

type TemplateCardProps = {
  template: DashboardTemplate
}

export function TemplateCard({ template }: TemplateCardProps) {
  return (
    <section className="glass-panel rounded-2xl p-5">
      <div className="space-y-2">
        <p className="text-sm font-medium text-primary">{template.name}</p>
        <p className="text-sm text-muted-foreground">{template.description}</p>
        <div className="flex flex-wrap gap-2">
          <span className="glass-chip rounded-full px-3 py-1 text-xs text-muted-foreground">
            {template.strategyKey === "custom" ? "Custom" : "Dynamic"}
          </span>
          {template.entityTypes.map((entityType) => (
            <span
              key={entityType}
              className="glass-chip rounded-full px-3 py-1 text-xs text-muted-foreground"
            >
              {entityType}
            </span>
          ))}
        </div>
      </div>

      <div className="glass-chip mt-4 rounded-2xl p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Best for
        </p>
        <p className="mt-1 text-sm text-foreground">{template.idealFor}</p>
      </div>

      <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
        {template.widgets.map((widget) => (
          <li key={widget} className="glass-chip rounded-xl px-3 py-2">
            {widget}
          </li>
        ))}
      </ul>

      <Link
        href={`/dashboard/new?template=${template.id}`}
        className="mt-5 inline-flex h-9 items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
      >
        Start from template
      </Link>
    </section>
  )
}
