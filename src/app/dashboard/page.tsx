import Link from "next/link"
import { TemplateCard } from "@/components/dashboard/template-card"
import { listStoredDashboards } from "@/lib/dashboard-store"
import { sampleDashboards, dashboardTemplates } from "@/lib/mock-dashboards"

export const dynamic = "force-dynamic"

function formatSavedTime(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso))
}

export default async function DashboardPage() {
  const savedDashboards = await listStoredDashboards()

  return (
    <main className="bg-background px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-10">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Your dashboards
            </h1>
            <p className="text-sm text-muted-foreground">
              Preview mode is active while authentication is being configured.
            </p>
          </div>
          <Link
            href="/dashboard/new"
            className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
          >
            Create dashboard
          </Link>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border bg-card p-5 shadow-sm">
            <p className="text-sm text-muted-foreground">Saved boards</p>
            <p className="mt-2 text-3xl font-semibold">{savedDashboards.length}</p>
          </div>
          <div className="rounded-lg border bg-card p-5 shadow-sm">
            <p className="text-sm text-muted-foreground">Starter templates</p>
            <p className="mt-2 text-3xl font-semibold">{dashboardTemplates.length}</p>
          </div>
          <div className="rounded-lg border bg-card p-5 shadow-sm">
            <p className="text-sm text-muted-foreground">Core research angles</p>
            <p className="mt-2 text-3xl font-semibold">8+</p>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium">Saved dashboards</h2>
              <p className="text-sm text-muted-foreground">
                Boards you create in the builder now persist between sessions.
              </p>
            </div>
          </div>

          {savedDashboards.length > 0 ? (
            <div className="grid gap-5 lg:grid-cols-2">
              {savedDashboards.map((dashboard) => (
                <Link
                  key={dashboard.id}
                  href={`/dashboard/${dashboard.id}`}
                  className="rounded-lg border bg-card p-5 shadow-sm transition hover:border-primary/50 hover:bg-accent/30"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-primary">
                        {dashboard.templateName}
                      </p>
                      <h3 className="mt-1 text-xl font-semibold tracking-tight">
                        {dashboard.name}
                      </h3>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatSavedTime(dashboard.updatedAt)}
                    </span>
                  </div>

                  <p className="mt-3 text-sm text-muted-foreground">
                    {dashboard.description || "No description added yet."}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-md bg-muted px-3 py-1 text-xs text-muted-foreground">
                      {dashboard.panels.length} panels
                    </span>
                    <span className="rounded-md bg-muted px-3 py-1 text-xs text-muted-foreground">
                      Saved board
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed bg-card/50 p-8 text-center">
              <p className="text-lg font-semibold tracking-tight">
                No saved dashboards yet
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Build one from a template and it will show up here automatically.
              </p>
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium">Sample dashboards</h2>
              <p className="text-sm text-muted-foreground">
                These still show the broader product direction.
              </p>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {sampleDashboards.map((dashboard) => (
              <Link
                key={dashboard.id}
                href={`/dashboard/${dashboard.id}`}
                className="rounded-lg border bg-card p-5 shadow-sm transition hover:border-primary/50 hover:bg-accent/30"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-primary">
                      {dashboard.name}
                    </p>
                    <h3 className="mt-1 text-xl font-semibold tracking-tight">
                      {dashboard.matchup}
                    </h3>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {dashboard.updatedAt}
                  </span>
                </div>

                <p className="mt-3 text-sm text-muted-foreground">
                  {dashboard.summary}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {dashboard.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-md bg-muted px-3 py-1 text-xs text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-medium">Start with a template</h2>
            <p className="text-sm text-muted-foreground">
              Begin with the questions you already ask every time you bet.
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            {dashboardTemplates.map((template) => (
              <TemplateCard key={template.id} template={template} />
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}

