import { NextResponse } from "next/server"
import { createStoredDashboard } from "@/lib/dashboard-store"

export async function POST(request: Request) {
  try {
    const payload = await request.json()

    const dashboard = await createStoredDashboard({
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

    return NextResponse.json({ id: dashboard.id })
  } catch {
    return NextResponse.json(
      { error: "Unable to save dashboard" },
      { status: 500 }
    )
  }
}
