import { NextResponse } from "next/server"
import { checkRateLimit } from "@/lib/rate-limit"
import { interpretWidgetPrompt } from "@/lib/widget-interpreter"

function getRateLimitId(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")
  const ip = forwarded?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip") ?? "anonymous"
  return `interpret:${ip}`
}

function createWidgetId() {
  return `widget-${Math.random().toString(36).slice(2, 10)}`
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
      prompt?: unknown
      entityType?: unknown
      strategyKey?: unknown
      preferredViewType?: unknown
      defaultOpponentId?: unknown
      defaultOpponentName?: unknown
    }

    if (typeof payload.prompt !== "string" || payload.prompt.trim().length < 4) {
      return NextResponse.json(
        { error: "Enter a more specific widget prompt." },
        { status: 400 }
      )
    }

    if (payload.entityType !== "team" && payload.entityType !== "player") {
      return NextResponse.json({ error: "Invalid entity type." }, { status: 400 })
    }

    if (payload.strategyKey !== "custom" && payload.strategyKey !== "away_after_away_fade") {
      return NextResponse.json({ error: "Invalid strategy key." }, { status: 400 })
    }

    const result = await interpretWidgetPrompt({
      id: createWidgetId(),
      prompt: payload.prompt,
      entityType: payload.entityType,
      strategyKey: payload.strategyKey,
      preferredViewType:
        payload.preferredViewType === "stat" ||
        payload.preferredViewType === "trend" ||
        payload.preferredViewType === "table" ||
        payload.preferredViewType === "comparison"
          ? payload.preferredViewType
          : null,
      defaultOpponentId:
        typeof payload.defaultOpponentId === "string" ? payload.defaultOpponentId : "",
      defaultOpponentName:
        typeof payload.defaultOpponentName === "string" ? payload.defaultOpponentName : "",
    })

    return NextResponse.json(result)
  } catch {
    return NextResponse.json(
      { error: "Unable to interpret widget prompt." },
      { status: 500 }
    )
  }
}
