import { NextResponse } from "next/server"
import { getCurrentDashboardOwnerId } from "@/lib/auth"
import {
  generateShareTokenForUser,
  revokeShareTokenForUser,
} from "@/lib/dashboard-store"

type RouteProps = {
  params: Promise<{ id: string }>
}

export async function DELETE(_request: Request, { params }: RouteProps) {
  try {
    const userId = await getCurrentDashboardOwnerId()

    if (!userId) {
      return NextResponse.json(
        { error: "Sign in to manage share links." },
        { status: 401 }
      )
    }

    const { id } = await params
    const revoked = await revokeShareTokenForUser(userId, id)

    if (!revoked) {
      return NextResponse.json(
        { error: "Dashboard not found." },
        { status: 404 }
      )
    }

    return NextResponse.json({ revoked: true })
  } catch {
    return NextResponse.json(
      { error: "Unable to revoke share link." },
      { status: 500 }
    )
  }
}

export async function POST(request: Request, { params }: RouteProps) {
  try {
    const userId = await getCurrentDashboardOwnerId()

    if (!userId) {
      return NextResponse.json(
        { error: "Sign in to share dashboards." },
        { status: 401 }
      )
    }

    const { id } = await params
    let regenerate = false
    try {
      const body = (await request.json()) as { regenerate?: boolean }
      regenerate = Boolean(body?.regenerate)
    } catch {
      // No body
    }
    if (regenerate) {
      await revokeShareTokenForUser(userId, id)
    }
    const token = await generateShareTokenForUser(userId, id)

    if (!token) {
      return NextResponse.json(
        { error: "Dashboard not found." },
        { status: 404 }
      )
    }

    return NextResponse.json({
      token,
      shareUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/share/${token}`,
    })
  } catch {
    return NextResponse.json(
      { error: "Unable to generate share link." },
      { status: 500 }
    )
  }
}
