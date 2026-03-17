import Link from "next/link"
import { isClerkConfigured } from "@/lib/clerk"
import { dashboardStrategyDefinitions } from "@/lib/dashboard-definitions"
import { dashboardTemplates } from "@/lib/mock-dashboards"

export default function Home() {
  return (
    <main className="bg-background px-6 py-16">
      <div className="mx-auto flex max-w-6xl flex-col gap-16">
        <section className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div className="space-y-6">
            <div className="space-y-3">
              <p className="text-sm font-medium text-primary">NBA betting prep</p>
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
                Stop doing 50 Google searches before every bet.
              </h1>
              <p className="max-w-2xl text-base text-muted-foreground sm:text-lg">
                Build a reusable research dashboard that pulls together player
                trends, home and away splits, fatigue spots, and matchup notes
                in one place.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href={isClerkConfigured ? "/dashboard" : "/dashboard"}
                className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
              >
                {isClerkConfigured ? "Open your dashboards" : "Open dashboards"}
              </Link>
              <Link
                href="/dashboard/new"
                className="inline-flex h-10 items-center justify-center rounded-lg border border-border px-4 text-sm font-medium transition hover:bg-muted"
              >
                {isClerkConfigured ? "Start building" : "Start from a template"}
              </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border bg-card p-4">
                <p className="text-2xl font-semibold">
                  {dashboardStrategyDefinitions.filter((strategy) => strategy.key !== "custom").length}
                </p>
                <p className="text-sm text-muted-foreground">Dynamic strategies</p>
              </div>
              <div className="rounded-lg border bg-card p-4">
                <p className="text-2xl font-semibold">{dashboardTemplates.length}</p>
                <p className="text-sm text-muted-foreground">Starter templates</p>
              </div>
              <div className="rounded-lg border bg-card p-4">
                <p className="text-2xl font-semibold">8+</p>
                <p className="text-sm text-muted-foreground">Research angles per board</p>
              </div>
            </div>
          </div>

          <section className="rounded-xl border bg-card p-6 shadow-sm">
            <div className="space-y-2">
              <p className="text-sm font-medium text-primary">What this becomes</p>
              <h2 className="text-2xl font-semibold tracking-tight">
                A workspace built for the way people actually research bets.
              </h2>
            </div>
            <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
              <li className="rounded-lg bg-muted/60 px-4 py-3">
                Build one dashboard per bet type, team, or nightly slate.
              </li>
              <li className="rounded-lg bg-muted/60 px-4 py-3">
                Save the exact widgets you always look up before placing a bet.
              </li>
              <li className="rounded-lg bg-muted/60 px-4 py-3">
                Mix trend charts, matchup notes, travel spots, and player context.
              </li>
            </ul>
          </section>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          {dashboardTemplates.map((template) => (
            <Link
              key={template.id}
              href={`/dashboard/new?template=${template.id}`}
              className="rounded-lg border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30"
            >
              <p className="text-sm font-medium text-primary">{template.name}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {template.description}
              </p>
              <p className="mt-4 text-sm text-foreground">{template.idealFor}</p>
              <p className="mt-4 text-sm font-medium text-primary">
                Start from template →
              </p>
            </Link>
          ))}
        </section>
      </div>
    </main>
  )
}

