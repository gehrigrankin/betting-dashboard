import { NextResponse } from "next/server"
import { getCurrentDashboardOwnerId } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const dashboardId = url.searchParams.get("dashboardId")
    const userId = await getCurrentDashboardOwnerId()
    if (!userId) {
      return NextResponse.json(
        { error: "Sign in to view alerts." },
        { status: 401 }
      )
    }
    const alerts = await prisma.alert.findMany({
      where: {
        userId,
        ...(dashboardId ? { dashboardId } : {}),
      },
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json({
      alerts: alerts.map((a) => ({
        id: a.id,
        dashboardId: a.dashboardId,
        type: a.type,
        config: a.config,
        createdAt: a.createdAt.toISOString(),
      })),
    })
  } catch {
    return NextResponse.json({ error: "Unable to list alerts." }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getCurrentDashboardOwnerId()
    if (!userId) {
      return NextResponse.json(
        { error: "Sign in to create alerts." },
        { status: 401 }
      )
    }
    const payload = (await request.json()) as {
      dashboardId?: string
      type?: string
      config?: Record<string, unknown>
    }
    const type = payload.type ?? "line_move"
    const config = payload.config ?? {}
    const alert = await prisma.alert.create({
      data: {
        userId,
        dashboardId: payload.dashboardId ?? null,
        type,
        config,
      },
    })
    return NextResponse.json({
      id: alert.id,
      type: alert.type,
      createdAt: alert.createdAt.toISOString(),
    })
  } catch {
    return NextResponse.json(
      { error: "Unable to create alert." },
      { status: 500 }
    )
  }
}
