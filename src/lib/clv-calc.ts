import { americanOddsToDecimal } from "@/lib/ev-calc"
import { round, toNumber } from "@/lib/sports-provider/normalize"

export type ClvGrade = "beat-closing" | "matched" | "lost-value"

export type ClvResult = {
  betDecimalOdds: number
  closingDecimalOdds: number
  clvPercent: number
  clvAmount: number
  grade: ClvGrade
}

const MATCH_TOLERANCE_PERCENT = 0.5

export function gradeClv(clvPercent: number): ClvGrade {
  if (clvPercent > MATCH_TOLERANCE_PERCENT) {
    return "beat-closing"
  }

  if (clvPercent < -MATCH_TOLERANCE_PERCENT) {
    return "lost-value"
  }

  return "matched"
}

// American odds between -100 and 100 (exclusive) aren't valid prices, but ev-calc's
// shared americanOddsToDecimal only rejects 0 for other callers — enforce the
// stricter band here rather than widening that shared reject rule.
function isValidAmericanOdds(value: string | number | null | undefined): boolean {
  const parsed = toNumber(value)
  return parsed !== null && (parsed <= -100 || parsed >= 100)
}

export function calculateClv(
  betOdds: string | number | null | undefined,
  closingOdds: string | number | null | undefined,
  stake: string | number | null | undefined,
  digits = 2
): ClvResult | null {
  const stakeAmount = toNumber(stake)

  if (
    !isValidAmericanOdds(betOdds) ||
    !isValidAmericanOdds(closingOdds) ||
    stakeAmount === null ||
    stakeAmount <= 0
  ) {
    return null
  }

  const betDecimal = americanOddsToDecimal(betOdds)
  const closingDecimal = americanOddsToDecimal(closingOdds)

  if (betDecimal === null || closingDecimal === null) {
    return null
  }

  const clvFraction = betDecimal / closingDecimal - 1
  const clvPercent = round(clvFraction * 100, digits) as number
  const clvAmount = round(stakeAmount * clvFraction, digits) as number

  return {
    betDecimalOdds: betDecimal,
    closingDecimalOdds: closingDecimal,
    clvPercent,
    clvAmount,
    grade: gradeClv(clvPercent),
  }
}
