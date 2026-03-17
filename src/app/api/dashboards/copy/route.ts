import { NextResponse } from "next/server"
import { getCurrentDashboardOwnerId } from "@/lib/auth"
import {
  createStoredDashboardForUser,
  getStoredDashboardByIdForUser,
  getStoredDashboardByShareToken,
} from "@/lib/dashboard-store"
import type { DashboardWidgetSpec } from "@/lib/widget-spec"
import type { GridItemLayout } from "@/lib/dashboard-builder"

function createWidgetId() {
  return `widget-${Math.random().toString(36).slice(2, 10)}`
}

function copyWidgetSpecs(specs: DashboardWidgetSpec[]): {
  specs: DashboardWidgetSpec[]
  idMap: Map<string, string>
} {
  const idMap = new Map<string, string>()
  const copied = specs.map((spec) => {
    const newId = createWidgetId()
    idMap.set(spec.id, newId)
    return { ...spec, id: newId }
  })
  return { specs: copied, idMap }
}

function copyLayout(layout: GridItemLayout[], idMap: Map<string, string>): GridItemLayout[] {
  return layout.map((item) => {
    const newId = idMap.get(item.i) ?? createWidgetId()
    return { ...item, i: newId }
  })
}

export async function POST(request: Request) {
  try {
    const userId = await getCurrentDashboardOwnerId()

    if (!userId) {
      return NextResponse.json(
        { error: "Sign in to copy dashboards." },
        { status: 401 }
      )
    }

    const payload = (await request.json()) as {
      sourceId?: string
      shareToken?: string
    }

    let source =
      payload.shareToken
        ? await getStoredDashboardByShareToken(payload.shareToken)
        : payload.sourceId
          ? await getStoredDashboardByIdForUser(payload.sourceId, userId)
          : null

    if (!source) {
      return NextResponse.json(
        { error: "Dashboard not found or not shared." },
        { status: 404 }
      )
    }

    const { specs: widgetSpecs, idMap } = copyWidgetSpecs(source.widgetSpecs)
    const layout = copyLayout(source.layout, idMap)

    const dashboard = await createStoredDashboardForUser(userId, {
      name: `Copy of ${source.name}`,
      description: source.description,
      templateId: source.templateId,
      templateName: source.templateName,
      scope: source.scope,
      widgetSpecs,
      panels: [],
      layout,
    })

    return NextResponse.json({ id: dashboard.id })
  } catch {
    return NextResponse.json(
      { error: "Unable to copy dashboard." },
      { status: 500 }
    )
  }
}
