import { CreateDashboardBuilder } from "@/components/dashboard/create-dashboard-builder"
import { PageTopbar } from "@/components/layout/page-topbar"
import { dashboardTemplates } from "@/lib/mock-dashboards"

type NewDashboardPageProps = {
  searchParams?: Promise<{
    template?: string
  }>
}

export default async function NewDashboardPage({
  searchParams,
}: NewDashboardPageProps) {
  const params = await searchParams
  const selectedTemplate =
    dashboardTemplates.find((template) => template.id === params?.template) ??
    dashboardTemplates[0]

  return (
    <>
      <PageTopbar backHref="/dashboard" backLabel="Back to dashboards" />
      <main className="bg-background px-6 py-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-10">
          <CreateDashboardBuilder
            key={selectedTemplate.id}
            template={selectedTemplate}
          />
        </div>
      </main>
    </>
  )
}
