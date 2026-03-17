import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getNbaPlayerPropMarkets, getNbaTeamSchedule } from "@/lib/sports-provider/client"

type LineMoveAlertConfig = {
  baselineLine?: number | null
  marketName?: string | null
}

async function getCurrentPlayerPropLine(params: {
  teamExternalId: string | null
  playerExternalId: string | null
  season: number | null
}): Promise<{ line: number | null; marketName: string | null }> {
  if (!params.teamExternalId || !params.playerExternalId || !params.season) {
    return { line: null, marketName: null }
  }

  const teamGames = await getNbaTeamSchedule(params.teamExternalId, params.season)
  const upcoming = teamGames
    .filter((game) => game.didWin === null)
    .sort((left, right) => left.date.localeCompare(right.date))[0]

  if (!upcoming) {
    return { line: null, marketName: null }
  }

  const markets = await getNbaPlayerPropMarkets(
    upcoming.id,
    params.teamExternalId,
    params.playerExternalId
  )
  const priority = ["Points", "PRA", "Rebounds", "Assists", "Threes"]
  const preferred =
    markets.find((market) => priority.includes(market.marketName)) ?? markets[0] ?? null

  if (!preferred) {
    return { line: null, marketName: null }
  }

  const rawLine = preferred.line ?? preferred.openLine ?? null
  const line = rawLine !== null ? Number(rawLine) : null

  return {
    line: Number.isFinite(line) ? line : null,
    marketName: preferred.marketName,
  }
}

/**
 * Alert check: intended to be called by a cron (e.g. Vercel Cron or external).
 * For line-move alerts, it:
 * - Loads the related dashboard
 * - Fetches the current prop line for the player
 * - Compares against the stored baseline in alert.config.baselineLine
 * - Logs any alerts where the line has moved meaningfully
 */
export async function GET() {
  try {
    const alerts = await prisma.alert.findMany({
      where: { type: "line_move", dashboardId: { not: null } },
      include: {
        dashboard: true,
      },
    })

    let examined = 0
    let skipped = 0
    let triggered = 0

    for (const alert of alerts as Array<
      typeof alerts[number] & { dashboard: { entityType: string | null; entityExternalId: string | null; entityTeamExternalId: string | null; season: number | null } | null }
    >) {
      if (!alert.dashboard || alert.dashboard.entityType !== "player") {
        skipped += 1
        continue
      }

      examined += 1

      const config = (alert.config ?? {}) as LineMoveAlertConfig
      const baselineLine = typeof config.baselineLine === "number" ? config.baselineLine : null

      if (baselineLine === null) {
        skipped += 1
        continue
      }

      const { line: currentLine, marketName } = await getCurrentPlayerPropLine({
        teamExternalId: alert.dashboard.entityTeamExternalId,
        playerExternalId: alert.dashboard.entityExternalId,
        season: alert.dashboard.season,
      })

      if (currentLine === null) {
        skipped += 1
        continue
      }

      const move = currentLine - baselineLine
      const threshold = 0.5

      if (Math.abs(move) >= threshold) {
        triggered += 1
        console.info("[alerts/check] line_move triggered", {
          alertId: alert.id,
          dashboardId: alert.dashboardId,
          marketName,
          baselineLine,
          currentLine,
          move,
        })
      }
    }

    console.info("[alerts/check] run complete", {
      total: alerts.length,
      examined,
      skipped,
      triggered,
    })

    return NextResponse.json({
      checked: true,
      total: alerts.length,
      examined,
      skipped,
      triggered,
      message: "Checked line_move alerts and logged any meaningful moves.",
    })
  } catch (err) {
    console.error("[alerts/check]", err)
    return NextResponse.json(
      { error: "Check failed." },
      { status: 500 }
    )
  }
}
