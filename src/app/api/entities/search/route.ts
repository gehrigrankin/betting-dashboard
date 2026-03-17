import { NextResponse } from "next/server"
import { searchNbaEntities } from "@/lib/sports-provider/client"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const entityType = searchParams.get("type")
  const query = searchParams.get("q") ?? ""

  if (entityType !== "team" && entityType !== "player") {
    return NextResponse.json({ error: "Unsupported entity type" }, { status: 400 })
  }

  try {
    const results = await searchNbaEntities(entityType, query)
    return NextResponse.json({ results })
  } catch {
    return NextResponse.json(
      { error: "Unable to search entities right now" },
      { status: 500 }
    )
  }
}
