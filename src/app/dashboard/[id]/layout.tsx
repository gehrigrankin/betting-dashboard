import type { ReactNode } from "react"
import { PageTopbar } from "@/components/layout/page-topbar"

export default function DashboardDetailLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <>
      <PageTopbar backHref="/dashboard" backLabel="Back to dashboards" />
      {children}
    </>
  )
}
