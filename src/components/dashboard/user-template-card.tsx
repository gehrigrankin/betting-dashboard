import Link from "next/link"
import type { StoredDashboard } from "@/lib/dashboard-builder"

type UserTemplateCardProps = {
  dashboard: StoredDashboard
}

export function UserTemplateCard({ dashboard }: UserTemplateCardProps) {
  return (
    <section className="glass-panel rounded-2xl p-5">
      <div className="space-y-2">
        <p className="text-sm font-medium text-primary">{dashboard.name}</p>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {dashboard.description || "No description."}
        </p>
        <div className="flex flex-wrap gap-2">
          <span className="glass-chip rounded-full px-3 py-1 text-xs text-muted-foreground">
            {(dashboard.widgetSpecs.length || dashboard.panels.length)} widgets
          </span>
          {dashboard.scope ? (
            <span className="glass-chip rounded-full px-3 py-1 text-xs text-muted-foreground">
              {dashboard.scope.entityType}
            </span>
          ) : null}
        </div>
      </div>
      <Link
        href={`/dashboard/new?fromDashboard=${dashboard.id}`}
        className="mt-5 inline-flex h-9 items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
      >
        Start from this
      </Link>
    </section>
  )
}
