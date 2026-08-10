import { describe, expect, it } from "vitest"
import { calculateClv, gradeClv } from "./clv-calc"

describe("clv-calc", () => {
  describe("calculateClv", () => {
    it("grades a beat-closing bet when the line moved in the bettor's favor", () => {
      // Bet at -110 (decimal 21/11), closed at -130 (decimal 23/13): better price than closing.
      // ratio = (21/11)/(23/13) = 273/253 = 1.079051...
      const result = calculateClv(-110, -130, 100)
      expect(result).not.toBeNull()
      expect(result!.clvPercent).toBeCloseTo(7.91, 2)
      expect(result!.grade).toBe("beat-closing")
      expect(result!.clvValue).toBeCloseTo(7.91, 2)
    })

    it("grades a lost-value bet when the line moved against the bettor", () => {
      // Bet at -130, closed at -110: worse price than closing.
      // ratio = (23/13)/(21/11) = 253/273 = 0.926739...
      const result = calculateClv(-130, -110, 100)
      expect(result).not.toBeNull()
      expect(result!.clvPercent).toBeCloseTo(-7.33, 2)
      expect(result!.grade).toBe("lost-value")
    })

    it("grades a matched bet when bet odds equal closing odds", () => {
      const result = calculateClv(-110, -110, 100)
      expect(result).not.toBeNull()
      expect(result!.clvPercent).toBe(0)
      expect(result!.clvValue).toBe(0)
      expect(result!.grade).toBe("matched")
    })

    it("treats tiny moves within tolerance as matched", () => {
      const result = calculateClv(-110, -111, 100)
      expect(result).not.toBeNull()
      expect(result!.grade).toBe("matched")
    })

    it("scales clvValue with stake", () => {
      const small = calculateClv(-110, -130, 50)
      const large = calculateClv(-110, -130, 200)
      expect(small).not.toBeNull()
      expect(large).not.toBeNull()
      expect(small!.clvValue).toBeCloseTo(3.95, 2)
      expect(large!.clvValue).toBeCloseTo(15.81, 2)
    })

    it("handles positive American odds", () => {
      const result = calculateClv(150, 130, 100)
      expect(result).not.toBeNull()
      expect(result!.grade).toBe("beat-closing")
    })

    it("parses numeric strings", () => {
      const result = calculateClv("-110", "-130", "100")
      expect(result).not.toBeNull()
      expect(result!.clvPercent).toBeCloseTo(7.91, 2)
    })

    it("returns null for missing or invalid odds", () => {
      expect(calculateClv(null, -110, 100)).toBeNull()
      expect(calculateClv(-110, undefined, 100)).toBeNull()
      expect(calculateClv("N/A", -110, 100)).toBeNull()
      expect(calculateClv(0, -110, 100)).toBeNull()
    })

    it("returns null for missing or non-positive stake", () => {
      expect(calculateClv(-110, -130, null)).toBeNull()
      expect(calculateClv(-110, -130, 0)).toBeNull()
      expect(calculateClv(-110, -130, -50)).toBeNull()
    })
  })

  describe("gradeClv", () => {
    it("grades positive CLV above tolerance as beat-closing", () => {
      expect(gradeClv(0.51)).toBe("beat-closing")
      expect(gradeClv(10)).toBe("beat-closing")
    })

    it("grades negative CLV below tolerance as lost-value", () => {
      expect(gradeClv(-0.51)).toBe("lost-value")
      expect(gradeClv(-10)).toBe("lost-value")
    })

    it("grades CLV within tolerance as matched", () => {
      expect(gradeClv(0)).toBe("matched")
      expect(gradeClv(0.5)).toBe("matched")
      expect(gradeClv(-0.5)).toBe("matched")
    })
  })
})
