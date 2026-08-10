import { americanOddsToDecimal } from "@/lib/ev-calc"
import { round, toNumber } from "@/lib/sports-provider/normalize"

export type ClvGrade = "beat-closing" | "matched" | "lost-value"

export type ClvResult = {
  betDecimalOdds: number
  closingDecimalOdds: number
  clvPercent: number
  clvValue: number
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

export function calculateClv(
  betOdds: string | number | null | undefined,
  closingOdds: string | number | null | undefined,
  stake: string | number | null | undefined,
  digits = 2
): ClvResult | null {
  const betDecimal = americanOddsToDecimal(betOdds)
  const closingDecimal = americanOddsToDecimal(closingOdds)
  const stakeAmount = toNumber(stake)

  if (
    betDecimal === null ||
    closingDecimal === null ||
    stakeAmount === null ||
    stakeAmount <= 0
  ) {
    return null
  }

  const clvFraction = betDecimal / closingDecimal - 1
  const clvPercent = round(clvFraction * 100, digits) as number
  const clvValue = round(stakeAmount * clvFraction, digits) as number

  return {
    betDecimalOdds: betDecimal,
    closingDecimalOdds: closingDecimal,
    clvPercent,
    clvValue,
    grade: gradeClv(clvPercent),
  }
}
