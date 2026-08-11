import { describe, expect, it } from "vitest"
import {
  americanOddsToDecimal,
  calculateEdge,
  calculateExpectedValue,
  impliedProbability,
} from "./ev-calc"

describe("ev-calc", () => {
  describe("americanOddsToDecimal", () => {
    it("converts favorite (negative) odds", () => {
      expect(americanOddsToDecimal(-110)).toBeCloseTo(1.909090909, 6)
      expect(americanOddsToDecimal(-200)).toBe(1.5)
    })

    it("converts underdog (positive) odds", () => {
      expect(americanOddsToDecimal(150)).toBe(2.5)
      expect(americanOddsToDecimal(100)).toBe(2)
    })

    it("parses numeric strings, as used in sports-provider odds snapshots", () => {
      expect(americanOddsToDecimal("-110")).toBeCloseTo(1.909090909, 6)
      expect(americanOddsToDecimal("+150")).toBe(2.5)
    })

    it("returns null for missing or invalid odds", () => {
      expect(americanOddsToDecimal(null)).toBeNull()
      expect(americanOddsToDecimal(undefined)).toBeNull()
      expect(americanOddsToDecimal("")).toBeNull()
      expect(americanOddsToDecimal("N/A")).toBeNull()
      expect(americanOddsToDecimal(0)).toBeNull()
    })
  })

  describe("impliedProbability", () => {
    it("computes implied probability for favorites and underdogs", () => {
      expect(impliedProbability(-110)).toBeCloseTo(0.52380952, 6)
      expect(impliedProbability(150)).toBe(0.4)
      expect(impliedProbability(-100)).toBe(0.5)
      expect(impliedProbability(100)).toBe(0.5)
    })

    it("returns null for missing odds", () => {
      expect(impliedProbability(null)).toBeNull()
      expect(impliedProbability(undefined)).toBeNull()
      expect(impliedProbability("pk")).toBeNull()
    })
  })

  describe("calculateExpectedValue", () => {
    it("computes positive EV when true probability beats the market", () => {
      expect(calculateExpectedValue(-110, 0.55)).toBe(0.05)
      expect(calculateExpectedValue(150, 0.5)).toBe(0.25)
    })

    it("computes zero EV when true probability equals implied probability", () => {
      const fairProbability = impliedProbability(-110)
      expect(calculateExpectedValue(-110, fairProbability)).toBe(0)
    })

    it("computes negative EV when true probability trails the market", () => {
      expect(calculateExpectedValue(-110, 0.45)).toBe(-0.1409)
    })

    it("returns null when odds are missing", () => {
      expect(calculateExpectedValue(null, 0.55)).toBeNull()
      expect(calculateExpectedValue(undefined, 0.55)).toBeNull()
      expect(calculateExpectedValue("N/A", 0.55)).toBeNull()
    })

    it("returns null when probability is missing or out of range", () => {
      expect(calculateExpectedValue(-110, null)).toBeNull()
      expect(calculateExpectedValue(-110, undefined)).toBeNull()
      expect(calculateExpectedValue(-110, Number.NaN)).toBeNull()
      expect(calculateExpectedValue(-110, -0.1)).toBeNull()
      expect(calculateExpectedValue(-110, 1.1)).toBeNull()
    })

    it("rounds to the requested precision", () => {
      expect(calculateExpectedValue(-110, 0.6, 4)).toBe(0.1455)
      expect(calculateExpectedValue(-110, 0.6, 2)).toBe(0.15)
      expect(calculateExpectedValue(-110, 0.6, 0)).toBe(0)
    })
  })

  describe("calculateEdge", () => {
    it("computes edge as true probability minus implied probability", () => {
      expect(calculateEdge(-110, 0.55)).toBe(0.0262)
      expect(calculateEdge(150, 0.5)).toBe(0.1)
    })

    it("returns zero edge at the market's implied probability", () => {
      const fairProbability = impliedProbability(-110)
      expect(calculateEdge(-110, fairProbability)).toBe(0)
    })

    it("computes negative edge when true probability trails the market", () => {
      expect(calculateEdge(-110, 0.4)).toBe(-0.1238)
    })

    it("returns null when odds or probability are missing", () => {
      expect(calculateEdge(null, 0.55)).toBeNull()
      expect(calculateEdge(-110, null)).toBeNull()
      expect(calculateEdge(-110, undefined)).toBeNull()
      expect(calculateEdge(-110, 1.5)).toBeNull()
    })

    it("rounds to the requested precision", () => {
      expect(calculateEdge(-110, 0.6, 2)).toBe(0.08)
    })
  })
})
