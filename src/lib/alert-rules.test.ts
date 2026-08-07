import { describe, expect, it } from "vitest"
import {
  decideLineMoveAlert,
  evaluateLineMove,
  isDuplicateAlert,
  parseLineMoveAlertConfig,
  LINE_MOVE_THRESHOLD,
} from "./alert-rules"

describe("alert-rules", () => {
  describe("parseLineMoveAlertConfig", () => {
    it("returns null fields for missing config", () => {
      expect(parseLineMoveAlertConfig(null)).toEqual({ baselineLine: null, lastAlertedLine: null })
      expect(parseLineMoveAlertConfig(undefined)).toEqual({ baselineLine: null, lastAlertedLine: null })
    })

    it("returns null fields for non-object config", () => {
      expect(parseLineMoveAlertConfig("bad").baselineLine).toBeNull()
      expect(parseLineMoveAlertConfig(42).baselineLine).toBeNull()
      expect(parseLineMoveAlertConfig(["array"]).baselineLine).toBeNull()
    })

    it("returns null fields when they are missing or non-numeric", () => {
      expect(parseLineMoveAlertConfig({}).baselineLine).toBeNull()
      expect(parseLineMoveAlertConfig({ baselineLine: "22.5" }).baselineLine).toBeNull()
      expect(parseLineMoveAlertConfig({ baselineLine: null }).baselineLine).toBeNull()
      expect(parseLineMoveAlertConfig({ lastAlertedLine: "22.5" }).lastAlertedLine).toBeNull()
    })

    it("extracts numeric baselineLine and lastAlertedLine", () => {
      expect(parseLineMoveAlertConfig({ baselineLine: 22.5 }).baselineLine).toBe(22.5)
      expect(parseLineMoveAlertConfig({ baselineLine: 0 }).baselineLine).toBe(0)
      expect(parseLineMoveAlertConfig({ baselineLine: 20, lastAlertedLine: 20.5 })).toEqual({
        baselineLine: 20,
        lastAlertedLine: 20.5,
      })
    })
  })

  describe("evaluateLineMove", () => {
    it("does not trigger when either line is missing", () => {
      expect(evaluateLineMove(null, 20)).toEqual({ triggered: false, move: null })
      expect(evaluateLineMove(20, null)).toEqual({ triggered: false, move: null })
      expect(evaluateLineMove(null, null)).toEqual({ triggered: false, move: null })
    })

    it("triggers exactly at the default threshold boundary", () => {
      expect(evaluateLineMove(20.5, 20)).toEqual({ triggered: true, move: 0.5 })
      expect(evaluateLineMove(19.5, 20)).toEqual({ triggered: true, move: -0.5 })
    })

    it("does not trigger just below the threshold boundary", () => {
      expect(evaluateLineMove(20.49, 20)).toEqual({ triggered: false, move: expect.closeTo(0.49) })
      expect(evaluateLineMove(19.51, 20)).toEqual({ triggered: false, move: expect.closeTo(-0.49) })
    })

    it("does not trigger when the lines are unchanged", () => {
      expect(evaluateLineMove(20, 20)).toEqual({ triggered: false, move: 0 })
    })

    it("respects a custom threshold, including at its exact boundary", () => {
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

  describe("isDuplicateAlert", () => {
    it("is not a duplicate when there is no prior alert", () => {
      expect(isDuplicateAlert(20.5, null)).toBe(false)
    })

    it("is not a duplicate when the current line is unknown", () => {
      expect(isDuplicateAlert(null, 20.5)).toBe(false)
    })

    it("is a duplicate when the current line matches the last alerted line exactly", () => {
      expect(isDuplicateAlert(20.5, 20.5)).toBe(true)
    })

    it("is not a duplicate once the line has moved past the last alerted line", () => {
      expect(isDuplicateAlert(21, 20.5)).toBe(false)
    })
  })

  describe("decideLineMoveAlert", () => {
    it("does not trigger and is not suppressed when line data is missing", () => {
      expect(
        decideLineMoveAlert({ currentLine: null, baselineLine: 20, lastAlertedLine: null })
      ).toEqual({ triggered: false, move: null, suppressed: false })

      expect(
        decideLineMoveAlert({ currentLine: 20.5, baselineLine: null, lastAlertedLine: null })
      ).toEqual({ triggered: false, move: null, suppressed: false })
    })

    it("triggers on a first-time move at the exact threshold boundary", () => {
      expect(
        decideLineMoveAlert({ currentLine: 20.5, baselineLine: 20, lastAlertedLine: null })
      ).toEqual({ triggered: true, move: 0.5, suppressed: false })
    })

    it("does not trigger when the move is below the threshold", () => {
      expect(
        decideLineMoveAlert({ currentLine: 20.25, baselineLine: 20, lastAlertedLine: null })
      ).toEqual({ triggered: false, move: 0.25, suppressed: false })
    })

    it("suppresses a repeat alert for a line already alerted on", () => {
      expect(
        decideLineMoveAlert({ currentLine: 20.5, baselineLine: 20, lastAlertedLine: 20.5 })
      ).toEqual({ triggered: false, move: 0.5, suppressed: true })
    })

    it("triggers again once the line moves further past the last alerted value", () => {
      expect(
        decideLineMoveAlert({ currentLine: 21, baselineLine: 20, lastAlertedLine: 20.5 })
      ).toEqual({ triggered: true, move: 1, suppressed: false })
    })

    it("is never suppressed when the move does not meet the threshold in the first place", () => {
      expect(
        decideLineMoveAlert({ currentLine: 20.5, baselineLine: 20.25, lastAlertedLine: 20.5 })
      ).toEqual({ triggered: false, move: 0.25, suppressed: false })
    })

    it("respects a custom threshold", () => {
      expect(
        decideLineMoveAlert({ currentLine: 22, baselineLine: 20, lastAlertedLine: null, threshold: 2 })
      ).toEqual({ triggered: true, move: 2, suppressed: false })
    })
  })
})
