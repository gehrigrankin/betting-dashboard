import Link from "next/link"
import { notFound } from "next/navigation"
import { SavedDashboardCanvas } from "@/components/dashboard/saved-dashboard-canvas"
import { WidgetCard } from "@/components/dashboard/widget-card"
import { getStoredDashboardById } from "@/lib/dashboard-store"
import { getDashboardById } from "@/lib/mock-dashboards"

type DashboardDetailPageProps = {
  params: Promise<{
    id: string
  }>
}

export default async function DashboardDetailPage({
  params,
}: DashboardDetailPageProps) {
  const { id } = await params
  const storedDashboard = await getStoredDashboardById(id)

  if (storedDashboard) {
    return (
      <main className="bg-background px-6 py-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-8">
          <header className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
            <div className="min-w-0 space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight">
                {storedDashboard.name}
              </h1>
              <p className="max-w-3xl text-sm text-muted-foreground">
                {storedDashboard.description || "No description added yet."}
              </p>
            </div>
            <div className="flex shrink-0 items-start justify-start md:justify-end">
              <Link
                href={`/dashboard/${storedDashboard.id}/edit`}
                className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
              >
                Edit board
              </Link>
            </div>
          </header>

          <SavedDashboardCanvas dashboard={storedDashboard} />
        </div>
      </main>
    )
  }

  const mockDashboard = getDashboardById(id)

  if (!mockDashboard) {
    notFound()
  }

  return (
    <main className="bg-background px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">
              {mockDashboard.matchup}
            </h1>
            <p className="max-w-3xl text-sm text-muted-foreground">
              {mockDashboard.summary}
            </p>
          </div>
        </header>

        <section className="grid gap-5 xl:grid-cols-2">
          {mockDashboard.widgets.map((widget) => (
            <WidgetCard key={widget.id} widget={widget} />
          ))}
        </section>
      </div>
    </main>
  )
}
