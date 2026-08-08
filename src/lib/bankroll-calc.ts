import {
  americanOddsToDecimal,
  calculateEdge,
  calculateExpectedValue,
  impliedProbability,
} from "@/lib/ev-calc"
import { round } from "@/lib/sports-provider/normalize"

export type KellyFractionPreference = "full" | "half" | "quarter"

export const kellyFractionOptions: Array<{
  value: KellyFractionPreference
  label: string
}> = [
  { value: "full", label: "Full Kelly" },
  { value: "half", label: "Half Kelly" },
  { value: "quarter", label: "Quarter Kelly" },
]

function isValidProbability(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 && value < 1
}

export function kellyMultiplier(preference: KellyFractionPreference) {
  switch (preference) {
    case "full":
      return 1
    case "half":
      return 0.5
    case "quarter":
      return 0.25
  }
}

export function fullKellyFraction(
  odds: string | number | null | undefined,
  trueProbability: number | null | undefined,
  digits = 4
) {
  const decimal = americanOddsToDecimal(odds)

  if (decimal === null || !isValidProbability(trueProbability)) {
    return null
  }

  const b = decimal - 1

  if (b <= 0) {
    return null
  }

  return round((decimal * trueProbability - 1) / b, digits)
}

export type BankrollCalculationInput = {
  bankroll: number
  odds: string | number | null | undefined
  trueProbability: number | null | undefined
  kellyPreference: KellyFractionPreference
}

export type BankrollCalculationResult = {
  decimalOdds: number
  impliedProbability: number
  edge: number
  expectedValuePerDollar: number
  fullKellyFraction: number
  kellyMultiplier: number
  appliedFraction: number
  recommendedStake: number
  hasEdge: boolean
}

export function calculateBankrollRecommendation(
  input: BankrollCalculationInput
): BankrollCalculationResult | null {
  const { bankroll, odds, trueProbability, kellyPreference } = input

  if (!Number.isFinite(bankroll) || bankroll <= 0) {
    return null
  }

  const decimalOdds = americanOddsToDecimal(odds)
  const implied = impliedProbability(odds)
  const kellyFraction = fullKellyFraction(odds, trueProbability, 6)
  const edge = calculateEdge(odds, trueProbability, 6)
  const expectedValuePerDollar = calculateExpectedValue(odds, trueProbability, 6)

  if (
    decimalOdds === null ||
    implied === null ||
    kellyFraction === null ||
    edge === null ||
    expectedValuePerDollar === null
  ) {
    return null
  }

  const multiplier = kellyMultiplier(kellyPreference)
  const appliedFraction = round(Math.max(kellyFraction, 0) * multiplier, 6) ?? 0
  const recommendedStake = round(bankroll * appliedFraction, 2) ?? 0

  return {
    decimalOdds: round(decimalOdds, 4) ?? decimalOdds,
    impliedProbability: round(implied, 4) ?? implied,
    edge,
    expectedValuePerDollar,
    fullKellyFraction: kellyFraction,
    kellyMultiplier: multiplier,
    appliedFraction,
    recommendedStake,
    hasEdge: kellyFraction > 0,
  }
}
