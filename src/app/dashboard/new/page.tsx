import { DynamicDashboardBuilder } from "@/components/dashboard/dynamic-dashboard-builder"
import { PageTopbar } from "@/components/layout/page-topbar"
import { getCurrentDashboardOwnerId } from "@/lib/auth"
import { getStoredDashboardByIdForUser } from "@/lib/dashboard-store"
import { dashboardTemplates } from "@/lib/mock-dashboards"

type NewDashboardPageProps = {
  searchParams?: Promise<{
    template?: string
    fromDashboard?: string
  }>
}

export default async function NewDashboardPage({
  searchParams,
}: NewDashboardPageProps) {
  const params = await searchParams
  const userId = await getCurrentDashboardOwnerId()
  let initialDashboard = null
  if (params?.fromDashboard && userId) {
    initialDashboard = await getStoredDashboardByIdForUser(
      params.fromDashboard,
      userId
    )
  }
  const selectedTemplate =
    dashboardTemplates.find((template) => template.id === params?.template) ??
    dashboardTemplates[0]

  return (
    <>
      <PageTopbar backHref="/dashboard" backLabel="Back to dashboards" />
      <main className="bg-background px-6 py-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-10">
          <DynamicDashboardBuilder
            key={initialDashboard?.id ?? selectedTemplate.id}
            initialDashboard={initialDashboard ?? undefined}
            template={
              initialDashboard
                ? dashboardTemplates.find(
                    (t) => t.id === initialDashboard!.templateId
                  ) ?? selectedTemplate
                : selectedTemplate
            }
          />
        </div>
      </main>
    </>
  )
}
