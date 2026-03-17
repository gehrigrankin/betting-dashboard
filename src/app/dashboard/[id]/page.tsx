import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import { DashboardBoardView } from "@/components/dashboard/dashboard-board-view"
import { getCurrentDashboardOwnerId } from "@/lib/auth"
import { isClerkConfigured } from "@/lib/clerk"
import { getStoredDashboardByIdForUser } from "@/lib/dashboard-store"
import { resolveDashboardWidgetsRobust } from "@/lib/widget-resolver"

type DashboardDetailPageProps = {
  params: Promise<{ id: string }>
}

export async function generateMetadata({
  params,
}: DashboardDetailPageProps): Promise<Metadata> {
  const { id } = await params
  const userId = await getCurrentDashboardOwnerId()
  const dashboard = userId ? await getStoredDashboardByIdForUser(id, userId) : null
  if (!dashboard) {
    return { title: "Dashboard" }
  }
  const title = `${dashboard.name} | Betting Dashboards`
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

export default async function DashboardDetailPage({
  params,
}: DashboardDetailPageProps) {
  const { id } = await params
  const userId = await getCurrentDashboardOwnerId()
  const storedDashboard = userId ? await getStoredDashboardByIdForUser(id, userId) : null

  if (!storedDashboard && isClerkConfigured) {
    redirect("/dashboard")
  }

  if (!storedDashboard) {
    notFound()
  }

  const initialResults =
    storedDashboard.scope && storedDashboard.widgetSpecs.length > 0
      ? await resolveDashboardWidgetsRobust(
          storedDashboard.widgetSpecs,
          storedDashboard.scope
        )
      : []

  return (
    <main className="bg-background px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <DashboardBoardView
          dashboard={storedDashboard}
          initialResults={initialResults}
        />
      </div>
    </main>
  )
}
