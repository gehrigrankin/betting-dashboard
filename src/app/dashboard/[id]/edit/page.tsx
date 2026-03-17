import { notFound, redirect } from "next/navigation"
import { DynamicDashboardBuilder } from "@/components/dashboard/dynamic-dashboard-builder"
import { getCurrentDashboardOwnerId } from "@/lib/auth"
import { isClerkConfigured } from "@/lib/clerk"
import { getStoredDashboardByIdForUser } from "@/lib/dashboard-store"
import { dashboardTemplates } from "@/lib/mock-dashboards"

type EditDashboardPageProps = {
  params: Promise<{
    id: string
  }>
}

export default async function EditDashboardPage({
  params,
}: EditDashboardPageProps) {
  const { id } = await params
  const userId = await getCurrentDashboardOwnerId()
  const dashboard = userId ? await getStoredDashboardByIdForUser(id, userId) : null

  if (!dashboard) {
    if (isClerkConfigured) {
      redirect("/dashboard")
    }
    notFound()
  }

  const template =
    dashboardTemplates.find((item) => item.id === dashboard.templateId) ??
    dashboardTemplates[0]

  return (
    <main className="bg-background px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-10">
        <DynamicDashboardBuilder
          initialDashboard={dashboard}
          key={dashboard.id}
          template={template}
        />
      </div>
    </main>
  )
}
