import { round, toNumber } from "@/lib/sports-provider/normalize"
import { americanOddsToDecimal } from "@/lib/ev-calc"

export const MIN_PARLAY_LEGS = 2
export const MAX_PARLAY_LEGS = 6

export type ParlayLegInput = string | number | null | undefined

export type ParlayResult = {
  decimalOdds: number
  americanOdds: number
  impliedProbability: number
  payout: number
  profit: number
}

export function decimalOddsToAmerican(decimalOdds: number | null | undefined) {
  if (
    typeof decimalOdds !== "number" ||
    !Number.isFinite(decimalOdds) ||
    decimalOdds <= 1
  ) {
    return null
  }

  return decimalOdds >= 2
    ? round((decimalOdds - 1) * 100, 0)
    : round(-100 / (decimalOdds - 1), 0)
}

export function calculateParlay(
  legs: ParlayLegInput[],
  stake: string | number | null | undefined
): ParlayResult | null {
  if (legs.length < MIN_PARLAY_LEGS || legs.length > MAX_PARLAY_LEGS) {
    return null
  }

  const legDecimals = legs.map((leg) => americanOddsToDecimal(leg))
  if (legDecimals.some((decimal) => decimal === null)) {
    return null
  }

  const combinedDecimal = legDecimals.reduce(
    (product, decimal) => product * (decimal as number),
    1
  )
  const americanOdds = decimalOddsToAmerican(combinedDecimal)
  const stakeAmount = toNumber(stake)

  if (americanOdds === null || stakeAmount === null || stakeAmount <= 0) {
    return null
  }

  const payout = stakeAmount * combinedDecimal

  return {
    decimalOdds: round(combinedDecimal, 4) as number,
    americanOdds,
    impliedProbability: round(1 / combinedDecimal, 4) as number,
    payout: round(payout, 2) as number,
    profit: round(payout - stakeAmount, 2) as number,
  }
}
