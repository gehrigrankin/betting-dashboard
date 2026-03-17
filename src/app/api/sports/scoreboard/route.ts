import { NextResponse } from "next/server"
import { getNbaScoreboard } from "@/lib/sports-provider/client"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get("date") ?? undefined
    const games = await getNbaScoreboard(date)
    return NextResponse.json({ games })
  } catch {
    return NextResponse.json(
      { error: "Unable to fetch scoreboard." },
      { status: 500 }
    )
  }
}
