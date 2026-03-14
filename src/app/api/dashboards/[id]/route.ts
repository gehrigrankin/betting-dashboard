import { NextResponse } from "next/server"
import { updateStoredDashboard } from "@/lib/dashboard-store"

type RouteProps = {
  params: Promise<{
    id: string
  }>
}

export async function PUT(request: Request, { params }: RouteProps) {
  try {
    const { id } = await params
    const payload = await request.json()

    const dashboard = await updateStoredDashboard(id, {
      name: typeof payload.name === "string" && payload.name.trim()
        ? payload.name
        : "Untitled dashboard",
      description: typeof payload.description === "string" ? payload.description : "",
      templateId: typeof payload.templateId === "string" ? payload.templateId : "custom",
      templateName:
        typeof payload.templateName === "string" ? payload.templateName : "Custom",
      panels: Array.isArray(payload.panels) ? payload.panels : [],
      layout: Array.isArray(payload.layout) ? payload.layout : [],
    })

    if (!dashboard) {
      return NextResponse.json({ error: "Dashboard not found" }, { status: 404 })
    }

    return NextResponse.json({ id: dashboard.id })
  } catch {
    return NextResponse.json(
      { error: "Unable to update dashboard" },
      { status: 500 }
    )
  }
}
