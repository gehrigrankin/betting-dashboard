import { describe, expect, it } from "vitest"
import { calculateParlay, decimalOddsToAmerican } from "./parlay-calc"

describe("parlay-calc", () => {
  describe("decimalOddsToAmerican", () => {
    it("converts decimal odds of 2 or more to positive American odds", () => {
      expect(decimalOddsToAmerican(3.644628099173554)).toBe(264)
      expect(decimalOddsToAmerican(2)).toBe(100)
    })

    it("converts decimal odds under 2 to negative American odds", () => {
      expect(decimalOddsToAmerican(1.21)).toBe(-476)
      expect(decimalOddsToAmerican(1.5)).toBe(-200)
    })

    it("returns null for invalid decimal odds", () => {
      expect(decimalOddsToAmerican(null)).toBeNull()
      expect(decimalOddsToAmerican(undefined)).toBeNull()
      expect(decimalOddsToAmerican(1)).toBeNull()
      expect(decimalOddsToAmerican(0.5)).toBeNull()
      expect(decimalOddsToAmerican(Number.NaN)).toBeNull()
    })
  })

  describe("calculateParlay", () => {
    it("combines two -110 legs into a standard +264 parlay", () => {
      const result = calculateParlay([-110, -110], 100)
      expect(result).not.toBeNull()
      expect(result?.decimalOdds).toBeCloseTo(3.6446, 4)
      expect(result?.americanOdds).toBe(264)
      expect(result?.impliedProbability).toBeCloseTo(0.2744, 4)
      expect(result?.payout).toBeCloseTo(364.46, 2)
      expect(result?.profit).toBeCloseTo(264.46, 2)
    })

    it("combines three -110 legs into roughly a +596 parlay", () => {
      const result = calculateParlay([-110, -110, -110], 50)
      expect(result?.americanOdds).toBe(596)
    })

    it("combines mixed favorite and underdog legs, including string input", () => {
      const result = calculateParlay(["+150", "-200"], 20)
      expect(result?.decimalOdds).toBeCloseTo(3.75, 4)
      expect(result?.americanOdds).toBe(275)
      expect(result?.impliedProbability).toBeCloseTo(0.2667, 4)
    })

    it("produces negative combined American odds for very heavy favorites", () => {
      const result = calculateParlay([-1000, -1000], 100)
      expect(result?.decimalOdds).toBeCloseTo(1.21, 4)
      expect(result?.americanOdds).toBe(-476)
    })

    it("returns null with fewer than two legs", () => {
      expect(calculateParlay([-110], 100)).toBeNull()
      expect(calculateParlay([], 100)).toBeNull()
    })

    it("returns null with more than six legs", () => {
      const sevenLegs = Array(7).fill(-110)
      expect(calculateParlay(sevenLegs, 100)).toBeNull()
    })

    it("accepts exactly six legs", () => {
      const sixLegs = Array(6).fill(-110)
      expect(calculateParlay(sixLegs, 100)).not.toBeNull()
    })

    it("returns null when any leg is invalid or missing", () => {
      expect(calculateParlay([-110, null], 100)).toBeNull()
      expect(calculateParlay([-110, "abc"], 100)).toBeNull()
      expect(calculateParlay([-110, 0], 100)).toBeNull()
    })

    it("returns null for a missing, zero, or negative stake", () => {
      expect(calculateParlay([-110, -110], null)).toBeNull()
      expect(calculateParlay([-110, -110], 0)).toBeNull()
      expect(calculateParlay([-110, -110], -50)).toBeNull()
      expect(calculateParlay([-110, -110], "")).toBeNull()
    })
  })
})
