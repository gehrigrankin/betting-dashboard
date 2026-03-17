import { NextResponse } from "next/server"
import type { DashboardScope } from "@/lib/dashboard-builder"
import {
  getCachedResolve,
  resolveCacheKey,
  setCachedResolve,
} from "@/lib/resolve-cache"
import { checkRateLimit } from "@/lib/rate-limit"
import { resolveDashboardWidgetsRobust } from "@/lib/widget-resolver"
import { parseWidgetSpec, type DashboardWidgetSpec } from "@/lib/widget-spec"

function parseScope(value: unknown): DashboardScope | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null
  }

  const scope = value as Record<string, unknown>

  if (
    scope.sport !== "NBA" ||
    (scope.strategyKey !== "custom" && scope.strategyKey !== "away_after_away_fade") ||
    (scope.entityType !== "team" && scope.entityType !== "player") ||
    typeof scope.entityId !== "string" ||
    typeof scope.entityName !== "string" ||
    typeof scope.season !== "number"
  ) {
    return null
  }

  return {
    sport: "NBA",
    strategyKey: scope.strategyKey,
    entityType: scope.entityType,
    entityId: scope.entityId,
    entityName: scope.entityName,
    entitySubtitle: typeof scope.entitySubtitle === "string" ? scope.entitySubtitle : "",
    entityTeamId: typeof scope.entityTeamId === "string" ? scope.entityTeamId : "",
    entityTeamName: typeof scope.entityTeamName === "string" ? scope.entityTeamName : "",
    opponentId: typeof scope.opponentId === "string" ? scope.opponentId : "",
    opponentName: typeof scope.opponentName === "string" ? scope.opponentName : "",
    season: scope.season,
  }
}

function getRateLimitId(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")
  const ip = forwarded?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip") ?? "anonymous"
  return `resolve:${ip}`
}

export async function POST(request: Request) {
  try {
    const { ok } = checkRateLimit(getRateLimitId(request))
    if (!ok) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a minute." },
        { status: 429 }
      )
    }

    const payload = (await request.json()) as {
      scope?: unknown
      widgetSpecs?: unknown
    }

    const scope = parseScope(payload.scope)

    if (!scope) {
      return NextResponse.json({ error: "Invalid selector scope." }, { status: 400 })
    }

    const widgetSpecs = Array.isArray(payload.widgetSpecs)
      ? payload.widgetSpecs
          .map(parseWidgetSpec)
          .filter((spec: DashboardWidgetSpec | null): spec is DashboardWidgetSpec =>
            Boolean(spec)
          )
      : []

    if (widgetSpecs.length === 0) {
      return NextResponse.json({ results: [] })
    }

    const cacheKey = resolveCacheKey(scope, widgetSpecs)
    const cached = getCachedResolve(cacheKey)
    if (cached) {
      return NextResponse.json({ results: cached })
    }

    const results = await resolveDashboardWidgetsRobust(widgetSpecs, scope)
    setCachedResolve(cacheKey, results)

    return NextResponse.json({ results })
  } catch (err) {
    console.error("[api/widgets/resolve]", err)
    return NextResponse.json({ error: "Unable to resolve widgets." }, { status: 500 })
  }
}
