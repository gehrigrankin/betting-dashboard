import { NextResponse } from "next/server"
import { getCurrentDashboardOwnerId } from "@/lib/auth"
import type { DashboardScope } from "@/lib/dashboard-builder"
import {
  archiveDashboardForUser,
  setDashboardTemplateForUser,
  updateDashboardNameForUser,
  updateStoredDashboardForUser,
} from "@/lib/dashboard-store"
import { parseWidgetSpec, type DashboardWidgetSpec } from "@/lib/widget-spec"

function parseScope(value: unknown): DashboardScope | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null
  }

  const scope = value as Record<string, unknown>

  if (
    scope.sport !== "NBA" ||
    (scope.strategyKey !== "custom" &&
      scope.strategyKey !== "away_after_away_fade") ||
    (scope.entityType !== "team" && scope.entityType !== "player") ||
    typeof scope.entityId !== "string" ||
    typeof scope.entityName !== "string" ||
    typeof scope.season !== "number"
  ) {
    return null
  }

  return {
    sport: "NBA" as const,
    strategyKey: scope.strategyKey as DashboardScope["strategyKey"],
    entityType: scope.entityType as DashboardScope["entityType"],
    entityId: scope.entityId,
    entityName: scope.entityName,
    entitySubtitle:
      typeof scope.entitySubtitle === "string" ? scope.entitySubtitle : "",
    entityTeamId: typeof scope.entityTeamId === "string" ? scope.entityTeamId : "",
    entityTeamName:
      typeof scope.entityTeamName === "string" ? scope.entityTeamName : "",
    opponentId: typeof scope.opponentId === "string" ? scope.opponentId : "",
    opponentName: typeof scope.opponentName === "string" ? scope.opponentName : "",
    season: scope.season,
  }
}

type RouteProps = {
  params: Promise<{
    id: string
  }>
}

export async function PUT(request: Request, { params }: RouteProps) {
  try {
    const userId = await getCurrentDashboardOwnerId()

    if (!userId) {
      return NextResponse.json(
        { error: "Sign in to save changes to dashboards." },
        { status: 401 }
      )
    }

    const { id } = await params
    const payload = await request.json()

    const dashboard = await updateStoredDashboardForUser(userId, id, {
      name: typeof payload.name === "string" && payload.name.trim()
        ? payload.name
        : "Untitled dashboard",
      description: typeof payload.description === "string" ? payload.description : "",
      templateId: typeof payload.templateId === "string" ? payload.templateId : "custom",
      templateName:
        typeof payload.templateName === "string" ? payload.templateName : "Custom",
      scope: parseScope(payload.scope),
      widgetSpecs: Array.isArray(payload.widgetSpecs)
        ? payload.widgetSpecs
            .map(parseWidgetSpec)
            .filter((spec: DashboardWidgetSpec | null): spec is DashboardWidgetSpec =>
              Boolean(spec)
            )
        : [],
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

export async function PATCH(
  request: Request,
  { params }: RouteProps
) {
  try {
    const userId = await getCurrentDashboardOwnerId()
    if (!userId) {
      return NextResponse.json(
        { error: "Sign in to update dashboards." },
        { status: 401 }
      )
    }
    const { id } = await params
    const payload = (await request.json()) as {
      name?: string
      isArchived?: boolean
      isTemplate?: boolean
    }

    if (typeof payload.name === "string") {
      const dashboard = await updateDashboardNameForUser(userId, id, payload.name)
      if (!dashboard) {
        return NextResponse.json({ error: "Dashboard not found" }, { status: 404 })
      }
      return NextResponse.json({ id: dashboard.id, name: dashboard.name })
    }

    if (payload.isArchived === true) {
      const ok = await archiveDashboardForUser(userId, id)
      if (!ok) {
        return NextResponse.json({ error: "Dashboard not found" }, { status: 404 })
      }
      return NextResponse.json({ id, archived: true })
    }

    if (typeof payload.isTemplate === "boolean") {
      const ok = await setDashboardTemplateForUser(userId, id, payload.isTemplate)
      if (!ok) {
        return NextResponse.json({ error: "Dashboard not found" }, { status: 404 })
      }
      return NextResponse.json({ id, isTemplate: payload.isTemplate })
    }

    return NextResponse.json({ error: "Nothing to update" }, { status: 400 })
  } catch {
    return NextResponse.json(
      { error: "Unable to update dashboard" },
      { status: 500 }
    )
  }
}
