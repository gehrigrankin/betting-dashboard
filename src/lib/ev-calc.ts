import { round, toNumber } from "@/lib/sports-provider/normalize"

function isValidProbability(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1
}

export function americanOddsToDecimal(odds: string | number | null | undefined) {
  const parsed = toNumber(odds)

  if (parsed === null || parsed === 0) {
    return null
  }

  return parsed > 0 ? 1 + parsed / 100 : 1 + 100 / -parsed
}

export function impliedProbability(odds: string | number | null | undefined) {
  const decimal = americanOddsToDecimal(odds)

  if (decimal === null) {
    return null
  }

  return 1 / decimal
}

export function calculateExpectedValue(
  odds: string | number | null | undefined,
  trueProbability: number | null | undefined,
  digits = 4
) {
  const decimal = americanOddsToDecimal(odds)

  if (decimal === null || !isValidProbability(trueProbability)) {
    return null
  }

  const ev = trueProbability * decimal - 1
  return round(ev, digits)
}

export function calculateEdge(
  odds: string | number | null | undefined,
  trueProbability: number | null | undefined,
  digits = 4
) {
  const implied = impliedProbability(odds)

  if (implied === null || !isValidProbability(trueProbability)) {
    return null
  }

  return round(trueProbability - implied, digits)
}
