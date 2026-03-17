import { describe, expect, it } from "vitest"
import {
  createWidgetSpec,
  parseWidgetSpec,
  normalizeWidgetFilters,
} from "./widget-spec"

describe("widget-spec", () => {
  describe("createWidgetSpec", () => {
    it("builds a full spec with defaults", () => {
      const spec = createWidgetSpec({
        id: "w1",
        prompt: "show points",
        entityType: "player",
      })
      expect(spec.id).toBe("w1")
      expect(spec.prompt).toBe("show points")
      expect(spec.entityType).toBe("player")
      expect(spec.viewType).toBe("stat")
      expect(spec.metric).toBe("points")
      expect(spec.aggregation).toBe("average")
      expect(spec.filters.sampleMode).toBe("all")
      expect(spec.filters.sampleSize).toBeNull()
    })

    it("uses last_n and sampleSize when provided", () => {
      const spec = createWidgetSpec({
        id: "w2",
        prompt: "last 10",
        entityType: "team",
        filters: { sampleMode: "last_n", sampleSize: 10 },
      })
      expect(spec.filters.sampleMode).toBe("last_n")
      expect(spec.filters.sampleSize).toBe(10)
    })
  })

  describe("parseWidgetSpec", () => {
    it("returns null for invalid input", () => {
      expect(parseWidgetSpec(null)).toBeNull()
      expect(parseWidgetSpec(undefined)).toBeNull()
      expect(parseWidgetSpec({})).toBeNull()
      expect(parseWidgetSpec({ id: "x", prompt: "y", entityType: "team" })).toBeNull() // missing specVersion
    })

    it("parses a valid spec", () => {
      const raw = {
        specVersion: 1,
        id: "w1",
        prompt: "points",
        summary: "Player points",
        entityType: "player",
        viewType: "trend",
        metric: "points",
        aggregation: "average",
        filters: { sampleMode: "last_n", sampleSize: 5 },
        comparison: null,
        presentation: { statLabel: "PTS", precision: 1, chartType: "line", tableLimit: 8 },
        legacyStaticContent: null,
      }
      const spec = parseWidgetSpec(raw)
      expect(spec).not.toBeNull()
      expect(spec!.id).toBe("w1")
      expect(spec!.viewType).toBe("trend")
      expect(spec!.filters.sampleMode).toBe("last_n")
      expect(spec!.filters.sampleSize).toBe(5)
    })
  })

  describe("normalizeWidgetFilters", () => {
    it("returns defaults for invalid input", () => {
      const f = normalizeWidgetFilters(null)
      expect(f.sampleMode).toBe("all")
      expect(f.sampleSize).toBeNull()
      expect(f.completedOnly).toBe(true)
    })

    it("normalizes last_n and sampleSize", () => {
      const f = normalizeWidgetFilters({
        sampleMode: "last_n",
        sampleSize: 10,
      })
      expect(f.sampleMode).toBe("last_n")
      expect(f.sampleSize).toBe(10)
    })
  })
})
