import { NextResponse } from "next/server"
import { getCurrentDashboardOwnerId } from "@/lib/auth"
import { prisma } from "@/lib/db"

type RouteProps = {
  params: Promise<{ id: string }>
}

export async function DELETE(
  _request: Request,
  { params }: RouteProps
) {
  try {
    const userId = await getCurrentDashboardOwnerId()
    if (!userId) {
      return NextResponse.json(
        { error: "Sign in to delete alerts." },
        { status: 401 }
      )
    }
    const { id } = await params
    await prisma.alert.deleteMany({
      where: { id, userId },
    })
    return NextResponse.json({ deleted: true })
  } catch {
    return NextResponse.json(
      { error: "Unable to delete alert." },
      { status: 500 }
    )
  }
}
