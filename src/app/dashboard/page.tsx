import Link from "next/link"
import { AlertsList } from "@/components/dashboard/alerts-list"
import { DashboardListCard } from "@/components/dashboard/dashboard-list-card"
import { TemplateCard } from "@/components/dashboard/template-card"
import { UserTemplateCard } from "@/components/dashboard/user-template-card"
import { getCurrentDashboardOwnerId } from "@/lib/auth"
import { isClerkConfigured } from "@/lib/clerk"
import { dashboardStrategyDefinitions } from "@/lib/dashboard-definitions"
import {
  listStoredDashboardsForUser,
  listTemplatesForUser,
} from "@/lib/dashboard-store"
import { dashboardTemplates } from "@/lib/mock-dashboards"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const userId = await getCurrentDashboardOwnerId()
  const savedDashboards = userId ? await listStoredDashboardsForUser(userId) : []
  const userTemplates =
    userId ? await listTemplatesForUser(userId) : []

  return (
    <main className="bg-background px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 sm:gap-10">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Your dashboards
            </h1>
            <p className="text-sm text-muted-foreground">
              {isClerkConfigured
                ? "Your saved research boards are tied to your account."
                : "Preview mode is active while authentication is being configured."}
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
          <div className="glass-panel rounded-2xl p-5">
            <p className="text-sm text-muted-foreground">Saved boards</p>
            <p className="mt-2 text-3xl font-semibold">{savedDashboards.length}</p>
          </div>
          <div className="glass-panel rounded-2xl p-5">
            <p className="text-sm text-muted-foreground">Starter templates</p>
            <p className="mt-2 text-3xl font-semibold">{dashboardTemplates.length}</p>
          </div>
          <div className="glass-panel rounded-2xl p-5">
            <p className="text-sm text-muted-foreground">Strategy models</p>
            <p className="mt-2 text-3xl font-semibold">
              {dashboardStrategyDefinitions.filter((strategy) => strategy.key !== "custom").length}
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium">Saved dashboards</h2>
              <p className="text-sm text-muted-foreground">
                {isClerkConfigured
                  ? "Boards you create in the builder save to your personal workspace."
                  : "Boards you create in the builder now persist between sessions."}
              </p>
            </div>
          </div>

          {savedDashboards.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2">
              {savedDashboards.map((dashboard) => (
                <DashboardListCard key={dashboard.id} dashboard={dashboard} />
              ))}
            </div>
          ) : (
            <div className="glass-panel rounded-2xl border-dashed p-8 text-center">
              <p className="text-lg font-semibold tracking-tight">
                No saved dashboards yet
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Build one from a template and it will show up here automatically.
              </p>
              <Link
                href="/dashboard/new"
                className="mt-4 inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
              >
                Create your first dashboard
              </Link>
            </div>
          )}
        </section>

        {userTemplates.length > 0 ? (
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-medium">Your templates</h2>
              <p className="text-sm text-muted-foreground">
                Boards you saved as starters. Use one to create a new dashboard with the same setup.
              </p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {userTemplates.map((dashboard) => (
                <UserTemplateCard key={dashboard.id} dashboard={dashboard} />
              ))}
            </div>
          </section>
        ) : null}

        {userId ? (
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-medium">Your alerts</h2>
              <p className="text-sm text-muted-foreground">
                Line-move notifications and other alerts. Remove any you no longer need.
              </p>
            </div>
            <AlertsList />
          </section>
        ) : null}

        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-medium">Start with a template</h2>
            <p className="text-sm text-muted-foreground">
              Pick a strategy, choose a default selector, and author prompt-backed widgets.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {dashboardTemplates.map((template) => (
              <TemplateCard key={template.id} template={template} />
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}

