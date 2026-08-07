import { beforeEach, describe, expect, it, vi } from "vitest"
import { PREVIEW_USER_ID } from "@/lib/auth"

const {
  dashboardCreate,
  dashboardFindFirst,
  dashboardUpdate,
  dashboardWidgetDeleteMany,
  userUpsert,
  transaction,
} = vi.hoisted(() => {
  const dashboardCreate = vi.fn()
  const dashboardFindFirst = vi.fn()
  const dashboardUpdate = vi.fn()
  const dashboardWidgetDeleteMany = vi.fn()
  const userUpsert = vi.fn()
  const transaction = vi.fn(async (callback: (tx: unknown) => unknown) =>
    callback({
      dashboard: { update: dashboardUpdate },
      dashboardWidget: { deleteMany: dashboardWidgetDeleteMany },
    })
  )

  return {
    dashboardCreate,
    dashboardFindFirst,
    dashboardUpdate,
    dashboardWidgetDeleteMany,
    userUpsert,
    transaction,
  }
})

vi.mock("@/lib/db", () => ({
  prisma: {
    dashboard: {
      create: dashboardCreate,
      findFirst: dashboardFindFirst,
    },
    user: {
      upsert: userUpsert,
    },
    $transaction: transaction,
  },
}))

import {
  createStoredDashboard,
  createStoredDashboardForUser,
  updateStoredDashboardForUser,
  getStoredDashboardByIdForUser,
} from "./dashboard-store"

function baseDashboardRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "dash-1",
    name: "My dashboard",
    description: null,
    shareToken: null,
    sport: "NBA" as const,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-02T00:00:00.000Z"),
    templateKind: "CUSTOM",
    strategyKey: null,
    entityType: null,
    entityExternalId: null,
    entityName: null,
    entitySubtitle: null,
    entityTeamExternalId: null,
    entityTeamName: null,
    opponentExternalId: null,
    opponentName: null,
    season: null,
    matchupLabel: "Custom",
    widgets: [] as Array<Record<string, unknown>>,
    ...overrides,
  }
}

const emptyWriteInput = {
  name: "My dashboard",
  description: "",
  templateId: "custom",
  templateName: "Custom",
  scope: null,
  widgetSpecs: [],
  panels: [],
  layout: [],
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("createStoredDashboardForUser", () => {
  it("ensures the user exists and builds widgets from panels with layout positions", async () => {
    dashboardCreate.mockResolvedValue(baseDashboardRecord())

    await createStoredDashboardForUser("user-abc", {
      ...emptyWriteInput,
      panels: [
        {
          id: "p1",
          title: "Notes",
          description: "desc",
          value: "val",
          kind: "note",
          tone: "yellow",
          notes: ["a"],
        },
      ],
      layout: [{ i: "p1", x: 5, y: 6, w: 7, h: 8 }],
    })

    expect(userUpsert).toHaveBeenCalledWith({
      where: { id: "user-abc" },
      update: {},
      create: { id: "user-abc" },
    })

    const createArgs = dashboardCreate.mock.calls[0][0]
    expect(createArgs.data.userId).toBe("user-abc")
    expect(createArgs.data.widgets.create).toEqual([
      {
        type: "NOTES",
        title: "Notes",
        positionX: 5,
        positionY: 6,
        width: 7,
        height: 8,
        config: { description: "desc", value: "val", kind: "note", tone: "yellow", notes: ["a"] },
      },
    ])
  })

  it("falls back to default layout positions when no layout entry matches a panel", async () => {
    dashboardCreate.mockResolvedValue(baseDashboardRecord())

    await createStoredDashboardForUser("user-abc", {
      ...emptyWriteInput,
      panels: [
        {
          id: "p1",
          title: "",
          description: "",
          value: "",
          kind: "note",
          tone: "yellow",
          notes: [],
        },
      ],
      layout: [],
    })

    const createArgs = dashboardCreate.mock.calls[0][0]
    expect(createArgs.data.widgets.create[0]).toMatchObject({
      title: "Untitled panel",
      positionX: 0,
      positionY: 0,
      width: 3,
      height: 3,
    })
  })

  it("maps the created record back into a StoredDashboard shape", async () => {
    dashboardCreate.mockResolvedValue(
      baseDashboardRecord({
        widgets: [
          {
            id: "w1",
            title: "Notes",
            positionX: 1,
            positionY: 2,
            width: 3,
            height: 4,
            config: { description: "d", value: "v", kind: "note", tone: "blue", notes: [] },
          },
        ],
      })
    )

    const result = await createStoredDashboardForUser("user-abc", emptyWriteInput)

    expect(result.id).toBe("dash-1")
    expect(result.scope).toBeNull()
    expect(result.layout).toEqual([{ i: "w1", x: 1, y: 2, w: 3, h: 4 }])
    expect(result.panels).toEqual([
      { id: "w1", title: "Notes", description: "d", value: "v", kind: "note", tone: "blue", notes: [] },
    ])
  })

  it("uses the preview user when called via createStoredDashboard", async () => {
    dashboardCreate.mockResolvedValue(baseDashboardRecord())

    await createStoredDashboard(emptyWriteInput)

    expect(userUpsert).toHaveBeenCalledWith({
      where: { id: PREVIEW_USER_ID },
      update: {},
      create: { id: PREVIEW_USER_ID },
    })
    expect(dashboardCreate.mock.calls[0][0].data.userId).toBe(PREVIEW_USER_ID)
  })
})

describe("updateStoredDashboardForUser", () => {
  it("returns null without writing when the dashboard does not belong to the user", async () => {
    dashboardFindFirst.mockResolvedValue(null)

    const result = await updateStoredDashboardForUser("user-abc", "dash-1", emptyWriteInput)

    expect(result).toBeNull()
    expect(transaction).not.toHaveBeenCalled()
  })

  it("replaces widget layout by deleting old widgets and recreating them at new positions", async () => {
    dashboardFindFirst.mockResolvedValue({ id: "dash-1" })
    dashboardUpdate.mockResolvedValue(
      baseDashboardRecord({
        widgets: [
          { id: "p1", title: "Notes", positionX: 9, positionY: 10, width: 2, height: 2, config: null },
        ],
      })
    )

    const result = await updateStoredDashboardForUser("user-abc", "dash-1", {
      ...emptyWriteInput,
      panels: [
        {
          id: "p1",
          title: "Notes",
          description: "",
          value: "",
          kind: "note",
          tone: "yellow",
          notes: [],
        },
      ],
      layout: [{ i: "p1", x: 9, y: 10, w: 2, h: 2 }],
    })

    expect(dashboardWidgetDeleteMany).toHaveBeenCalledWith({ where: { dashboardId: "dash-1" } })

    const updateArgs = dashboardUpdate.mock.calls[0][0]
    expect(updateArgs.where).toEqual({ id: "dash-1" })
    expect(updateArgs.data.widgets.create[0]).toMatchObject({
      positionX: 9,
      positionY: 10,
      width: 2,
      height: 2,
    })

    expect(result?.layout).toEqual([{ i: "p1", x: 9, y: 10, w: 2, h: 2 }])
  })
})

describe("getStoredDashboardByIdForUser", () => {
  it("returns null when no matching dashboard is found", async () => {
    dashboardFindFirst.mockResolvedValue(null)

    const result = await getStoredDashboardByIdForUser("missing", "user-abc")

    expect(result).toBeNull()
    expect(dashboardFindFirst).toHaveBeenCalledWith({
      where: { id: "missing", userId: "user-abc", isArchived: false },
      include: {
        widgets: {
          orderBy: [{ positionY: "asc" }, { positionX: "asc" }, { createdAt: "asc" }],
        },
      },
    })
  })

  it("loads a saved dashboard and rebuilds its scope from stored entity fields", async () => {
    dashboardFindFirst.mockResolvedValue(
      baseDashboardRecord({
        strategyKey: "AWAY_TO_AWAY_FADE",
        entityType: "TEAM",
        entityExternalId: "team-1",
        entityName: "Celtics",
        entitySubtitle: "NBA",
        entityTeamExternalId: "team-1",
        entityTeamName: "Celtics",
        opponentExternalId: "team-2",
        opponentName: "Lakers",
        season: 2026,
      })
    )

    const result = await getStoredDashboardByIdForUser("dash-1", "user-abc")

    expect(result?.scope).toEqual({
      sport: "NBA",
      strategyKey: "away_after_away_fade",
      entityType: "team",
      entityId: "team-1",
      entityName: "Celtics",
      entitySubtitle: "NBA",
      entityTeamId: "team-1",
      entityTeamName: "Celtics",
      opponentId: "team-2",
      opponentName: "Lakers",
      season: 2026,
    })
  })

  it("returns an empty layout, panels, and widgetSpecs for a dashboard with no widgets", async () => {
    dashboardFindFirst.mockResolvedValue(baseDashboardRecord({ widgets: [] }))

    const result = await getStoredDashboardByIdForUser("dash-1", "user-abc")

    expect(result?.layout).toEqual([])
    expect(result?.panels).toEqual([])
    expect(result?.widgetSpecs).toEqual([])
  })

  it("falls back to default panel values for malformed widget config", async () => {
    dashboardFindFirst.mockResolvedValue(
      baseDashboardRecord({
        widgets: [
          { id: "w1", title: "Broken", positionX: 0, positionY: 0, width: 1, height: 1, config: "not-json-object" },
          { id: "w2", title: "Also broken", positionX: 0, positionY: 1, width: 1, height: 1, config: null },
          { id: "w3", title: "Array config", positionX: 0, positionY: 2, width: 1, height: 1, config: [1, 2, 3] },
        ],
      })
    )

    const result = await getStoredDashboardByIdForUser("dash-1", "user-abc")

    expect(result?.panels).toEqual([
      { id: "w1", title: "Broken", description: "", value: "", kind: "note", tone: "yellow", notes: [] },
      { id: "w2", title: "Also broken", description: "", value: "", kind: "note", tone: "yellow", notes: [] },
      { id: "w3", title: "Array config", description: "", value: "", kind: "note", tone: "yellow", notes: [] },
    ])
    expect(result?.widgetSpecs).toHaveLength(3)
    expect(result?.widgetSpecs.every((spec) => spec.legacyStaticContent !== null)).toBe(true)
  })

  it("prefers a valid dynamic widget spec over the legacy panel config when both are parseable", async () => {
    dashboardFindFirst.mockResolvedValue(
      baseDashboardRecord({
        widgets: [
          {
            id: "w1",
            title: "Points",
            positionX: 0,
            positionY: 0,
            width: 4,
            height: 4,
            config: {
              specVersion: 1,
              id: "w1",
              prompt: "show points",
              summary: "",
              entityType: "player",
              entityBinding: "shared",
              viewType: "stat",
              metric: "points",
              aggregation: "average",
              filters: {
                seasonMode: "selected",
                sampleMode: "all",
                sampleSize: null,
                subjectVenue: "any",
                opponentVenue: "any",
                opponentId: "",
                opponentName: "",
                travelSpot: "any",
                completedOnly: true,
              },
              comparison: null,
              presentation: { statLabel: "PTS", precision: 1, chartType: "line", tableLimit: 8 },
              legacyStaticContent: null,
            },
          },
        ],
      })
    )

    const result = await getStoredDashboardByIdForUser("dash-1", "user-abc")

    expect(result?.panels).toEqual([])
    expect(result?.widgetSpecs).toEqual([
      expect.objectContaining({ id: "w1", title: "Points", metric: "points", viewType: "stat" }),
    ])
  })
})
