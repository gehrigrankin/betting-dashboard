import { NextResponse } from "next/server"
import { getCurrentDashboardOwnerId } from "@/lib/auth"
import type { DashboardScope } from "@/lib/dashboard-builder"
import { createStoredDashboardForUser } from "@/lib/dashboard-store"
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

export async function POST(request: Request) {
  try {
    const userId = await getCurrentDashboardOwnerId()

    if (!userId) {
      return NextResponse.json(
        { error: "Sign in to create and save dashboards." },
        { status: 401 }
      )
    }

    const payload = await request.json()

    const dashboard = await createStoredDashboardForUser(userId, {
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

    return NextResponse.json({ id: dashboard.id })
  } catch {
    return NextResponse.json(
      { error: "Unable to save dashboard" },
      { status: 500 }
    )
  }
}
