import type { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import { CopyDashboardButton } from "@/components/dashboard/copy-dashboard-button"
import { DashboardBoardView } from "@/components/dashboard/dashboard-board-view"
import { getStoredDashboardByShareToken } from "@/lib/dashboard-store"
import { resolveDashboardWidgetsRobust } from "@/lib/widget-resolver"

type SharePageProps = {
  params: Promise<{ token: string }>
}

export async function generateMetadata({
  params,
}: SharePageProps): Promise<Metadata> {
  const { token } = await params
  const dashboard = await getStoredDashboardByShareToken(token)
  if (!dashboard) {
    return { title: "Shared board" }
  }
  const title = `${dashboard.name} | Shared board`
  const description =
    dashboard.description ||
    `NBA research board${dashboard.scope?.entityName ? ` for ${dashboard.scope.entityName}` : ""}.`
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
    },
  }
}

export default async function SharePage({ params }: SharePageProps) {
  const { token } = await params
  const dashboard = await getStoredDashboardByShareToken(token)

  if (!dashboard) {
    notFound()
  }

  const initialResults =
    dashboard.scope && dashboard.widgetSpecs.length > 0
      ? await resolveDashboardWidgetsRobust(dashboard.widgetSpecs, dashboard.scope)
      : []

  return (
    <main className="bg-background px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Shared board
            </p>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {dashboard.name}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <CopyDashboardButton shareToken={token} />
            <Link
              href="/dashboard"
              className="inline-flex h-9 items-center justify-center rounded-lg border border-border px-3 text-sm font-medium transition hover:bg-muted"
            >
              Create your own
            </Link>
          </div>
        </header>
        <DashboardBoardView
          dashboard={dashboard}
          initialResults={initialResults}
          readOnly
        />
      </div>
    </main>
  )
}
