import type { PlayerGameLog, TeamGameLog } from "@/lib/sports-provider/types"

export function toNumber(value: string | number | null | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  if (typeof value === "string") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

export function average(values: Array<number | null | undefined>) {
  const numbers = values.filter((value): value is number => typeof value === "number")

  if (numbers.length === 0) {
    return null
  }

  return numbers.reduce((sum, value) => sum + value, 0) / numbers.length
}

export function round(value: number | null, digits = 1) {
  if (value === null) {
    return null
  }

  const multiplier = 10 ** digits
  return Math.round(value * multiplier) / multiplier
}

export function formatSigned(value: number | null, digits = 1) {
  if (value === null) {
    return "--"
  }

  const rounded = round(value, digits)

  if (rounded === null) {
    return "--"
  }

  return `${rounded > 0 ? "+" : ""}${rounded.toFixed(digits)}`
}

export function formatRecord(wins: number, losses: number) {
  return `${wins}-${losses}`
}

export function formatAverage(value: number | null, digits = 1) {
  const rounded = round(value, digits)
  return rounded === null ? "--" : rounded.toFixed(digits)
}

export function getRestDays(currentDate: string, previousDate: string | null) {
  if (!previousDate) {
    return null
  }

  const current = new Date(currentDate)
  const previous = new Date(previousDate)
  const diffMs = current.getTime() - previous.getTime()

  if (!Number.isFinite(diffMs) || diffMs <= 0) {
    return null
  }

  return Math.max(Math.round(diffMs / (1000 * 60 * 60 * 24)) - 1, 0)
}

export function buildMarginTrend(games: TeamGameLog[], limit = 5) {
  return games.slice(0, limit).map((game, index) => ({
    label: `G${index + 1}`,
    value:
      game.teamScore !== null && game.opponentScore !== null
        ? game.teamScore - game.opponentScore
        : 0,
  }))
}

export function buildPointsTrend(
  games: Array<Pick<PlayerGameLog, "points">>,
  limit = 5
) {
  return games.slice(0, limit).map((game, index) => ({
    label: `G${index + 1}`,
    value: game.points ?? 0,
  }))
}
