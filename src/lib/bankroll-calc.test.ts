import { describe, expect, it } from "vitest"
import {
  calculateBankrollRecommendation,
  fullKellyFraction,
  kellyMultiplier,
} from "./bankroll-calc"

describe("bankroll-calc", () => {
  describe("kellyMultiplier", () => {
    it("maps preferences to their fraction of full Kelly", () => {
      expect(kellyMultiplier("full")).toBe(1)
      expect(kellyMultiplier("half")).toBe(0.5)
      expect(kellyMultiplier("quarter")).toBe(0.25)
    })
  })

  describe("fullKellyFraction", () => {
    it("computes the Kelly stake fraction when true probability beats the market", () => {
      expect(fullKellyFraction(-110, 0.55)).toBe(0.055)
      expect(fullKellyFraction(150, 0.5)).toBeCloseTo(0.1667, 4)
    })

    it("is zero at the market's implied (fair) probability", () => {
      expect(fullKellyFraction(-110, 11 / 21)).toBeCloseTo(0, 6)
    })

    it("is negative when true probability trails the market", () => {
      expect(fullKellyFraction(-110, 0.45)).toBeCloseTo(-0.155, 4)
    })

    it("returns null for missing or invalid odds", () => {
      expect(fullKellyFraction(null, 0.55)).toBeNull()
      expect(fullKellyFraction(undefined, 0.55)).toBeNull()
      expect(fullKellyFraction("N/A", 0.55)).toBeNull()
    })

    it("returns null for missing or out-of-range probability", () => {
      expect(fullKellyFraction(-110, null)).toBeNull()
      expect(fullKellyFraction(-110, undefined)).toBeNull()
      expect(fullKellyFraction(-110, 0)).toBeNull()
      expect(fullKellyFraction(-110, 1)).toBeNull()
      expect(fullKellyFraction(-110, 1.1)).toBeNull()
    })
  })

  describe("calculateBankrollRecommendation", () => {
    it("recommends a full-Kelly stake when the bettor has an edge", () => {
      const result = calculateBankrollRecommendation({
        bankroll: 1000,
        odds: -110,
        trueProbability: 0.55,
        kellyPreference: "full",
      })

      expect(result).not.toBeNull()
      expect(result?.decimalOdds).toBeCloseTo(1.9091, 4)
      expect(result?.impliedProbability).toBeCloseTo(0.5238, 4)
      expect(result?.edge).toBeCloseTo(0.02619, 5)
      expect(result?.fullKellyFraction).toBeCloseTo(0.055, 4)
      expect(result?.kellyMultiplier).toBe(1)
      expect(result?.appliedFraction).toBeCloseTo(0.055, 4)
      expect(result?.recommendedStake).toBeCloseTo(55, 2)
      expect(result?.hasEdge).toBe(true)
    })

    it("scales the stake down for half and quarter Kelly preferences", () => {
      const half = calculateBankrollRecommendation({
        bankroll: 1000,
        odds: -110,
        trueProbability: 0.55,
        kellyPreference: "half",
      })
      const quarter = calculateBankrollRecommendation({
        bankroll: 1000,
        odds: -110,
        trueProbability: 0.55,
        kellyPreference: "quarter",
      })

      expect(half?.appliedFraction).toBeCloseTo(0.0275, 4)
      expect(half?.recommendedStake).toBeCloseTo(27.5, 2)
      expect(quarter?.appliedFraction).toBeCloseTo(0.01375, 5)
      expect(quarter?.recommendedStake).toBeCloseTo(13.75, 2)
    })

    it("recommends no stake when there is no edge", () => {
      const result = calculateBankrollRecommendation({
        bankroll: 1000,
        odds: -110,
        trueProbability: 0.45,
        kellyPreference: "full",
      })

      expect(result?.hasEdge).toBe(false)
      expect(result?.appliedFraction).toBe(0)
      expect(result?.recommendedStake).toBe(0)
    })

    it("returns null when bankroll is missing or not positive", () => {
      expect(
        calculateBankrollRecommendation({
          bankroll: 0,
          odds: -110,
          trueProbability: 0.55,
          kellyPreference: "full",
        })
      ).toBeNull()
      expect(
        calculateBankrollRecommendation({
          bankroll: Number.NaN,
          odds: -110,
          trueProbability: 0.55,
          kellyPreference: "full",
        })
      ).toBeNull()
    })

    it("returns null when odds or probability are invalid", () => {
      expect(
        calculateBankrollRecommendation({
          bankroll: 1000,
          odds: null,
          trueProbability: 0.55,
          kellyPreference: "full",
        })
      ).toBeNull()
      expect(
        calculateBankrollRecommendation({
          bankroll: 1000,
          odds: -110,
          trueProbability: null,
          kellyPreference: "full",
        })
      ).toBeNull()
    })
  })
})
