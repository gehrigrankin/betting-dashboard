import { describe, expect, it } from "vitest"
import {
  createWidgetSpec,
  createLegacyStaticWidgetSpec,
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

    it("falls back to the team metric default when entityType is team", () => {
      const spec = createWidgetSpec({ id: "w3", prompt: "team stuff", entityType: "team" })
      expect(spec.metric).toBe("team_points")
    })

    it("trims a blank title and prompt, falling back to defaults", () => {
      const spec = createWidgetSpec({
        id: "w4",
        prompt: "  show points  ",
        title: "   ",
        entityType: "player",
      })
      expect(spec.title).toBe("Untitled widget")
      expect(spec.prompt).toBe("show points")
      expect(spec.summary).toBe("Dynamic widget generated from the prompt.")
    })

    it("normalizes a comparison block, defaulting an unrecognized aggregation", () => {
      const spec = createWidgetSpec({
        id: "w5",
        prompt: "compare",
        entityType: "player",
        comparison: {
          label: "  ",
          aggregation: "not-a-real-aggregation",
          filters: { sampleMode: "last_n", sampleSize: 3 },
        },
      })
      expect(spec.comparison).not.toBeNull()
      expect(spec.comparison!.label).toBe("Comparison sample")
      expect(spec.comparison!.aggregation).toBe("average")
      expect(spec.comparison!.filters.sampleSize).toBe(3)
    })

    it("returns a null comparison for invalid input", () => {
      const spec = createWidgetSpec({
        id: "w6",
        prompt: "compare",
        entityType: "player",
        comparison: "not-an-object" as never,
      })
      expect(spec.comparison).toBeNull()
    })

    it("clamps presentation precision and tableLimit into range", () => {
      const spec = createWidgetSpec({
        id: "w7",
        prompt: "present",
        entityType: "player",
        presentation: { statLabel: "PTS", precision: 9, chartType: "bar", tableLimit: -4 },
      })
      expect(spec.presentation.precision).toBe(2)
      expect(spec.presentation.tableLimit).toBe(1)
      expect(spec.presentation.chartType).toBe("bar")
    })

    it("uses default presentation for invalid input", () => {
      const spec = createWidgetSpec({
        id: "w8",
        prompt: "present",
        entityType: "player",
        presentation: null as never,
      })
      expect(spec.presentation.statLabel).toBe("Value")
      expect(spec.presentation.precision).toBe(1)
      expect(spec.presentation.chartType).toBe("line")
      expect(spec.presentation.tableLimit).toBe(8)
    })

    it("normalizes legacyStaticContent, defaulting an unrecognized tone and kind", () => {
      const spec = createWidgetSpec({
        id: "w9",
        prompt: "legacy",
        entityType: "player",
        legacyStaticContent: {
          kind: "not-a-kind" as never,
          description: "desc",
          value: "42",
          tone: "not-a-tone" as never,
          notes: ["a", 2, "b"] as never,
        },
      })
      expect(spec.legacyStaticContent).toEqual({
        kind: "note",
        description: "desc",
        value: "42",
        tone: "yellow",
        notes: ["a", "b"],
      })
    })
  })

  describe("createLegacyStaticWidgetSpec", () => {
    it("builds a metric-kind legacy spec with a stat view", () => {
      const spec = createLegacyStaticWidgetSpec({
        id: "legacy-1",
        title: "Saved Note",
        entityType: "team",
        description: "A saved metric",
        value: "12",
        kind: "metric",
        tone: "blue",
        notes: ["note 1"],
      })
      expect(spec.viewType).toBe("stat")
      expect(spec.metric).toBe("static_text")
      expect(spec.aggregation).toBe("none")
      expect(spec.presentation.statLabel).toBe("Saved value")
      expect(spec.legacyStaticContent).toEqual({
        kind: "metric",
        description: "A saved metric",
        value: "12",
        tone: "blue",
        notes: ["note 1"],
      })
    })

    it("builds a checklist-kind legacy spec with a table view", () => {
      const spec = createLegacyStaticWidgetSpec({
        id: "legacy-2",
        title: "Checklist",
        entityType: "player",
        description: "",
        value: "",
        kind: "checklist",
        tone: "lavender",
        notes: [],
      })
      expect(spec.viewType).toBe("table")
      expect(spec.presentation.statLabel).toBe("Saved note")
    })
  })

  describe("parseWidgetSpec", () => {
    it("returns null for invalid input", () => {
      expect(parseWidgetSpec(null)).toBeNull()
      expect(parseWidgetSpec(undefined)).toBeNull()
      expect(parseWidgetSpec({})).toBeNull()
      expect(parseWidgetSpec("not-an-object")).toBeNull()
      expect(parseWidgetSpec(["array"])).toBeNull()
      expect(parseWidgetSpec({ id: "x", prompt: "y", entityType: "team" })).toBeNull() // missing specVersion
      expect(
        parseWidgetSpec({ specVersion: 2, id: "x", prompt: "y", entityType: "team" })
      ).toBeNull() // wrong specVersion
      expect(
        parseWidgetSpec({ specVersion: 1, id: "x", prompt: "y", entityType: "league" })
      ).toBeNull() // invalid entityType
      expect(parseWidgetSpec({ specVersion: 1, prompt: "y", entityType: "team" })).toBeNull() // missing id
    })

    it("falls back invalid viewType, metric, and aggregation to safe defaults", () => {
      const spec = parseWidgetSpec({
        specVersion: 1,
        id: "w1",
        prompt: "points",
        entityType: "player",
        viewType: "not-a-view-type",
        metric: "not-a-metric",
        aggregation: "not-an-aggregation",
      })
      expect(spec).not.toBeNull()
      expect(spec!.viewType).toBe("stat")
      expect(spec!.metric).toBe("points")
      expect(spec!.aggregation).toBe("average")
    })

    it("falls back an invalid team metric to the team default", () => {
      const spec = parseWidgetSpec({
        specVersion: 1,
        id: "w1",
        prompt: "points",
        entityType: "team",
        metric: "not-a-metric",
      })
      expect(spec!.metric).toBe("team_points")
    })

    it("defaults a missing summary and title", () => {
      const spec = parseWidgetSpec({
        specVersion: 1,
        id: "w1",
        prompt: "points",
        entityType: "player",
      })
      expect(spec!.summary).toBe("")
      expect(spec!.title).toBe("Untitled widget")
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

    it("returns defaults for a non-object or array value", () => {
      expect(normalizeWidgetFilters("bad").sampleMode).toBe("all")
      expect(normalizeWidgetFilters(["bad"]).sampleMode).toBe("all")
      expect(normalizeWidgetFilters(42).sampleMode).toBe("all")
    })

    it("rounds sampleSize and clamps it to a minimum of 1", () => {
      expect(normalizeWidgetFilters({ sampleSize: 4.6 }).sampleSize).toBe(5)
      expect(normalizeWidgetFilters({ sampleSize: -3 }).sampleSize).toBe(1)
      expect(normalizeWidgetFilters({ sampleSize: 0 }).sampleSize).toBe(1)
    })

    it("treats a non-finite or non-numeric sampleSize as null", () => {
      expect(normalizeWidgetFilters({ sampleSize: Number.NaN }).sampleSize).toBeNull()
      expect(normalizeWidgetFilters({ sampleSize: Infinity }).sampleSize).toBeNull()
      expect(normalizeWidgetFilters({ sampleSize: "10" }).sampleSize).toBeNull()
    })

    it("falls back invalid venue and travel values to their defaults", () => {
      const f = normalizeWidgetFilters({
        subjectVenue: "somewhere",
        opponentVenue: "somewhere",
        travelSpot: "not-a-spot",
      })
      expect(f.subjectVenue).toBe("any")
      expect(f.opponentVenue).toBe("any")
      expect(f.travelSpot).toBe("any")
    })

    it("accepts valid venue and travel values", () => {
      const f = normalizeWidgetFilters({
        subjectVenue: "home",
        opponentVenue: "away",
        travelSpot: "away_after_away",
      })
      expect(f.subjectVenue).toBe("home")
      expect(f.opponentVenue).toBe("away")
      expect(f.travelSpot).toBe("away_after_away")
    })

    it("defaults non-string opponentId and opponentName to empty strings", () => {
      const f = normalizeWidgetFilters({ opponentId: 123, opponentName: null })
      expect(f.opponentId).toBe("")
      expect(f.opponentName).toBe("")
    })

    it("treats completedOnly as true unless explicitly false", () => {
      expect(normalizeWidgetFilters({ completedOnly: false }).completedOnly).toBe(false)
      expect(normalizeWidgetFilters({ completedOnly: "false" }).completedOnly).toBe(true)
      expect(normalizeWidgetFilters({}).completedOnly).toBe(true)
    })
  })
})
