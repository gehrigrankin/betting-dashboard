import { describe, expect, it } from "vitest"
import { evaluateLineMove, parseLineMoveAlertConfig, LINE_MOVE_THRESHOLD } from "./alert-rules"

describe("alert-rules", () => {
  describe("parseLineMoveAlertConfig", () => {
    it("returns null baselineLine for missing config", () => {
      expect(parseLineMoveAlertConfig(null).baselineLine).toBeNull()
      expect(parseLineMoveAlertConfig(undefined).baselineLine).toBeNull()
    })

    it("returns null baselineLine for non-object config", () => {
      expect(parseLineMoveAlertConfig("bad").baselineLine).toBeNull()
      expect(parseLineMoveAlertConfig(42).baselineLine).toBeNull()
      expect(parseLineMoveAlertConfig(["array"]).baselineLine).toBeNull()
    })

    it("returns null baselineLine when the field is missing or non-numeric", () => {
      expect(parseLineMoveAlertConfig({}).baselineLine).toBeNull()
      expect(parseLineMoveAlertConfig({ baselineLine: "22.5" }).baselineLine).toBeNull()
      expect(parseLineMoveAlertConfig({ baselineLine: null }).baselineLine).toBeNull()
    })

    it("extracts a numeric baselineLine", () => {
      expect(parseLineMoveAlertConfig({ baselineLine: 22.5 }).baselineLine).toBe(22.5)
      expect(parseLineMoveAlertConfig({ baselineLine: 0 }).baselineLine).toBe(0)
    })
  })

  describe("evaluateLineMove", () => {
    it("does not trigger when either line is missing", () => {
      expect(evaluateLineMove(null, 20)).toEqual({ triggered: false, move: null })
      expect(evaluateLineMove(20, null)).toEqual({ triggered: false, move: null })
      expect(evaluateLineMove(null, null)).toEqual({ triggered: false, move: null })
    })

    it("triggers when the move meets the default threshold", () => {
      expect(evaluateLineMove(20.5, 20)).toEqual({ triggered: true, move: 0.5 })
    })

    it("triggers on a downward move that meets the default threshold", () => {
      expect(evaluateLineMove(19.5, 20)).toEqual({ triggered: true, move: -0.5 })
    })

    it("does not trigger when the move is below the default threshold", () => {
      expect(evaluateLineMove(20.25, 20)).toEqual({ triggered: false, move: 0.25 })
    })

    it("does not trigger when the lines are unchanged", () => {
      expect(evaluateLineMove(20, 20)).toEqual({ triggered: false, move: 0 })
    })

    it("respects a custom threshold", () => {
      expect(evaluateLineMove(21, 20, 2)).toEqual({ triggered: false, move: 1 })
      expect(evaluateLineMove(22, 20, 2)).toEqual({ triggered: true, move: 2 })
    })

    it("does not trigger for a NaN baseline", () => {
      const result = evaluateLineMove(20, Number.NaN)
      expect(result.triggered).toBe(false)
      expect(Number.isNaN(result.move)).toBe(true)
    })

    it("exposes the default threshold constant", () => {
      expect(LINE_MOVE_THRESHOLD).toBe(0.5)
    })
  })
})
