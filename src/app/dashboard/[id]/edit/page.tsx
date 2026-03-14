import { notFound } from "next/navigation"
import { CreateDashboardBuilder } from "@/components/dashboard/create-dashboard-builder"
import { PageTopbar } from "@/components/layout/page-topbar"
import { getStoredDashboardById } from "@/lib/dashboard-store"
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
  const dashboard = await getStoredDashboardById(id)

  if (!dashboard) {
    notFound()
  }

  const template =
    dashboardTemplates.find((item) => item.id === dashboard.templateId) ??
    dashboardTemplates[0]

  return (
    <>
      <PageTopbar backHref={`/dashboard/${dashboard.id}`} backLabel="Back to dashboard" />
      <main className="bg-background px-6 py-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-10">
          <CreateDashboardBuilder
            initialDashboard={dashboard}
            key={dashboard.id}
            template={template}
          />
        </div>
      </main>
    </>
  )
}
