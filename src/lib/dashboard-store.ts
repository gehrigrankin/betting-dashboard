import type { Prisma } from "@prisma/client"
import type {
  DashboardEntityType,
  DashboardPanel,
  GridItemLayout,
  DashboardScope,
  DashboardStrategyKey,
  StoredDashboard,
} from "@/lib/dashboard-builder"
import { PREVIEW_USER_ID } from "@/lib/auth"
import { prisma } from "@/lib/db"
import {
  createLegacyStaticWidgetSpec,
  parseWidgetSpec,
  type DashboardWidgetSpec,
} from "@/lib/widget-spec"

type DashboardWriteInput = {
  name: string
  description: string
  templateId: string
  templateName: string
  scope: DashboardScope | null
  widgetSpecs: DashboardWidgetSpec[]
  panels: DashboardPanel[]
  layout: GridItemLayout[]
}

type WidgetConfig = {
  description: string
  value: string
  kind: DashboardPanel["kind"]
  tone: DashboardPanel["tone"]
  notes: string[]
}

function getTemplateKind(templateId: string) {
  switch (templateId) {
    case "nba-player-props":
      return "NBA_PLAYER_PROPS" as const
    case "nba-team-matchup":
      return "NBA_TEAM_MATCHUP" as const
    case "nba-game-prep":
      return "NBA_GAME_PREP" as const
    case "away-to-away-fade":
      return "AWAY_TO_AWAY_FADE" as const
    default:
      return "CUSTOM" as const
  }
}

function getStrategyKey(strategyKey: DashboardStrategyKey | null | undefined) {
  switch (strategyKey) {
    case "away_after_away_fade":
      return "AWAY_TO_AWAY_FADE" as const
    default:
      return "CUSTOM" as const
  }
}

function parseWidgetConfig(config: Prisma.JsonValue): WidgetConfig {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    return {
      description: "",
      value: "",
      kind: "note",
      tone: "yellow",
      notes: [],
    }
  }

  const widgetConfig = config as Record<string, unknown>

  return {
    description:
      typeof widgetConfig.description === "string" ? widgetConfig.description : "",
    value: typeof widgetConfig.value === "string" ? widgetConfig.value : "",
    kind:
      widgetConfig.kind === "metric" ||
      widgetConfig.kind === "checklist" ||
      widgetConfig.kind === "note"
        ? widgetConfig.kind
        : "note",
    tone:
      widgetConfig.tone === "lavender" ||
      widgetConfig.tone === "blue" ||
      widgetConfig.tone === "yellow" ||
      widgetConfig.tone === "orange"
        ? widgetConfig.tone
        : "yellow",
    notes: Array.isArray(widgetConfig.notes)
      ? widgetConfig.notes.filter((note): note is string => typeof note === "string")
      : [],
  }
}

function getWidgetEntityType(
  dashboard: Pick<
    StoredDashboard,
    "scope"
  > | {
    entityType: string | null
  }
): DashboardEntityType {
  if ("scope" in dashboard) {
    return dashboard.scope?.entityType ?? "team"
  }

  return dashboard.entityType === "PLAYER" ? "player" : "team"
}

function getTemplateId(templateKind: string) {
  switch (templateKind) {
    case "NBA_PLAYER_PROPS":
      return "nba-player-props"
    case "NBA_TEAM_MATCHUP":
      return "nba-team-matchup"
    case "NBA_GAME_PREP":
      return "nba-game-prep"
    case "AWAY_TO_AWAY_FADE":
      return "away-to-away-fade"
    default:
      return "custom"
  }
}

function getStrategyId(strategyKey: string | null) {
  switch (strategyKey) {
    case "AWAY_TO_AWAY_FADE":
      return "away_after_away_fade" as const
    default:
      return "custom" as const
  }
}

function parseScope(dashboard: {
  sport: "NBA"
  strategyKey: string | null
  entityType: string | null
  entityExternalId: string | null
  entityName: string | null
  entitySubtitle: string | null
  entityTeamExternalId: string | null
  entityTeamName: string | null
  opponentExternalId: string | null
  opponentName: string | null
  season: number | null
}) {
  if (
    !dashboard.strategyKey ||
    !dashboard.entityType ||
    !dashboard.entityExternalId ||
    !dashboard.entityName ||
    !dashboard.season
  ) {
    return null
  }

  return {
    sport: dashboard.sport,
    strategyKey: getStrategyId(dashboard.strategyKey),
    entityType: dashboard.entityType === "PLAYER" ? "player" : "team",
    entityId: dashboard.entityExternalId,
    entityName: dashboard.entityName,
    entitySubtitle: dashboard.entitySubtitle ?? "",
    entityTeamId: dashboard.entityTeamExternalId ?? "",
    entityTeamName: dashboard.entityTeamName ?? "",
    opponentId: dashboard.opponentExternalId ?? "",
    opponentName: dashboard.opponentName ?? "",
    season: dashboard.season,
  } satisfies DashboardScope
}

function toStoredDashboard(dashboard: {
  id: string
  name: string
  description: string | null
  shareToken?: string | null
  sport: "NBA"
  createdAt: Date
  updatedAt: Date
  templateKind: string
  strategyKey: string | null
  entityType: string | null
  entityExternalId: string | null
  entityName: string | null
  entitySubtitle: string | null
  entityTeamExternalId: string | null
  entityTeamName: string | null
  opponentExternalId: string | null
  opponentName: string | null
  season: number | null
  matchupLabel: string | null
  widgets: Array<{
    id: string
    title: string
    positionX: number
    positionY: number
    width: number
    height: number
    config: Prisma.JsonValue
  }>
}) {
  const widgetSpecs: DashboardWidgetSpec[] = []
  const panels: DashboardPanel[] = []

  dashboard.widgets.forEach((widget) => {
    const parsedSpec = parseWidgetSpec(widget.config)

    if (parsedSpec) {
      widgetSpecs.push({
        ...parsedSpec,
        id: widget.id,
        title: widget.title,
      })
      return
    }

    const config = parseWidgetConfig(widget.config)

    panels.push({
      id: widget.id,
      title: widget.title,
      description: config.description,
      value: config.value,
      kind: config.kind,
      tone: config.tone,
      notes: config.notes,
    })

    widgetSpecs.push(
      createLegacyStaticWidgetSpec({
        id: widget.id,
        title: widget.title,
        entityType: getWidgetEntityType(dashboard),
        description: config.description,
        value: config.value,
        kind: config.kind,
        tone: config.tone,
        notes: config.notes,
      })
    )
  })

  const layout: GridItemLayout[] = dashboard.widgets.map((widget) => ({
    i: widget.id,
    x: widget.positionX,
    y: widget.positionY,
    w: widget.width,
    h: widget.height,
  }))

  return {
    id: dashboard.id,
    name: dashboard.name,
    description: dashboard.description ?? "",
    templateId: getTemplateId(dashboard.templateKind),
    templateName: dashboard.matchupLabel ?? "Custom",
    scope: parseScope(dashboard),
    shareToken: dashboard.shareToken ?? null,
    isTemplate: (dashboard as { isTemplate?: boolean }).isTemplate ?? false,
    createdAt: dashboard.createdAt.toISOString(),
    updatedAt: dashboard.updatedAt.toISOString(),
    panels,
    widgetSpecs,
    layout,
  } satisfies StoredDashboard
}

async function ensurePreviewUser() {
  await prisma.user.upsert({
    where: { id: PREVIEW_USER_ID },
    update: {},
    create: { id: PREVIEW_USER_ID },
  })
}

export async function listStoredDashboards() {
  return listStoredDashboardsForUser(PREVIEW_USER_ID)
}

export async function listStoredDashboardsForUser(userId: string) {
  const dashboards = await prisma.dashboard.findMany({
    where: {
      userId,
      isArchived: false,
    },
    include: {
      widgets: {
        orderBy: [{ positionY: "asc" }, { positionX: "asc" }, { createdAt: "asc" }],
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  })

  return dashboards.map(toStoredDashboard)
}

export async function getStoredDashboardById(id: string) {
  return getStoredDashboardByIdForUser(id, PREVIEW_USER_ID)
}

export async function getStoredDashboardByShareToken(shareToken: string) {
  const dashboard = await prisma.dashboard.findFirst({
    where: {
      shareToken,
      isArchived: false,
    },
    include: {
      widgets: {
        orderBy: [{ positionY: "asc" }, { positionX: "asc" }, { createdAt: "asc" }],
      },
    },
  })

  return dashboard ? toStoredDashboard(dashboard) : null
}

export async function generateShareTokenForUser(userId: string, dashboardId: string) {
  const existing = await prisma.dashboard.findFirst({
    where: { id: dashboardId, userId, isArchived: false },
    select: { id: true, shareToken: true },
  })

  if (!existing) {
    return null
  }

  const token =
    existing.shareToken ??
    `sh_${Buffer.from(`${dashboardId}-${Date.now()}`).toString("base64url").slice(0, 24)}`

  await prisma.dashboard.update({
    where: { id: dashboardId },
    data: { shareToken: token },
  })

  return token
}

export async function revokeShareTokenForUser(userId: string, dashboardId: string) {
  const existing = await prisma.dashboard.findFirst({
    where: { id: dashboardId, userId, isArchived: false },
    select: { id: true },
  })

  if (!existing) {
    return false
  }

  await prisma.dashboard.update({
    where: { id: dashboardId },
    data: { shareToken: null },
  })

  return true
}

export async function getStoredDashboardByIdForUser(id: string, userId: string) {
  const dashboard = await prisma.dashboard.findFirst({
    where: {
      id,
      userId,
      isArchived: false,
    },
    include: {
      widgets: {
        orderBy: [{ positionY: "asc" }, { positionX: "asc" }, { createdAt: "asc" }],
      },
    },
  })

  return dashboard ? toStoredDashboard(dashboard) : null
}

export async function createStoredDashboard(input: DashboardWriteInput) {
  return createStoredDashboardForUser(PREVIEW_USER_ID, input)
}

async function ensureUser(userId: string) {
  await prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: { id: userId },
  })
}

function buildWidgetCreateData(
  input: DashboardWriteInput,
  layoutById: Map<string, GridItemLayout>,
  entityType: DashboardEntityType
) {
  if (input.widgetSpecs.length > 0) {
    return input.widgetSpecs.map((widgetSpec) => {
      const layout = layoutById.get(widgetSpec.id)

      return {
        type:
          entityType === "player"
            ? ("PLAYER_RECENT_TREND" as const)
            : ("TEAM_RECENT_FORM" as const),
        title: widgetSpec.title.trim() || "Untitled widget",
        positionX: layout?.x ?? 0,
        positionY: layout?.y ?? 0,
        width: layout?.w ?? 4,
        height: layout?.h ?? 4,
        config: widgetSpec,
      }
    })
  }

  return input.panels.map((panel) => {
    const layout = layoutById.get(panel.id)

    return {
      type: "NOTES" as const,
      title: panel.title.trim() || "Untitled panel",
      positionX: layout?.x ?? 0,
      positionY: layout?.y ?? 0,
      width: layout?.w ?? 3,
      height: layout?.h ?? 3,
      config: {
        description: panel.description,
        value: panel.value,
        kind: panel.kind,
        tone: panel.tone,
        notes: panel.notes,
      },
    }
  })
}

export async function createStoredDashboardForUser(
  userId: string,
  input: DashboardWriteInput
) {
  if (userId === PREVIEW_USER_ID) {
    await ensurePreviewUser()
  } else {
    await ensureUser(userId)
  }

  const layoutById = new Map(input.layout.map((item) => [item.i, item]))
  const entityType = input.scope?.entityType ?? "team"
  const dashboard = await prisma.dashboard.create({
    data: {
      userId,
      name: input.name.trim(),
      description: input.description.trim() || null,
      templateKind: getTemplateKind(input.templateId),
      strategyKey:
        input.scope?.strategyKey && input.scope.strategyKey !== "custom"
          ? getStrategyKey(input.scope.strategyKey)
          : null,
      entityType:
        input.scope?.entityType === "team"
          ? "TEAM"
          : input.scope?.entityType === "player"
            ? "PLAYER"
            : null,
      entityExternalId: input.scope?.entityId || null,
      entityName: input.scope?.entityName || null,
      entitySubtitle: input.scope?.entitySubtitle || null,
      entityTeamExternalId: input.scope?.entityTeamId || null,
      entityTeamName: input.scope?.entityTeamName || null,
      opponentExternalId: input.scope?.opponentId || null,
      opponentName: input.scope?.opponentName || null,
      season: input.scope?.season ?? null,
      matchupLabel: input.templateName,
      widgets: {
        create: buildWidgetCreateData(input, layoutById, entityType),
      },
    },
    include: {
      widgets: {
        orderBy: [{ positionY: "asc" }, { positionX: "asc" }, { createdAt: "asc" }],
      },
    },
  })

  return toStoredDashboard(dashboard)
}

export async function updateStoredDashboard(
  id: string,
  input: DashboardWriteInput
) {
  return updateStoredDashboardForUser(PREVIEW_USER_ID, id, input)
}

export async function updateStoredDashboardForUser(
  userId: string,
  id: string,
  input: DashboardWriteInput
) {
  const existingDashboard = await prisma.dashboard.findFirst({
    where: {
      id,
      userId,
      isArchived: false,
    },
    select: {
      id: true,
    },
  })

  if (!existingDashboard) {
    return null
  }

  const layoutById = new Map(input.layout.map((item) => [item.i, item]))
  const entityType = input.scope?.entityType ?? "team"

  const dashboard = await prisma.$transaction(async (transaction) => {
    await transaction.dashboardWidget.deleteMany({
      where: {
        dashboardId: id,
      },
    })

    return transaction.dashboard.update({
      where: { id },
      data: {
        name: input.name.trim(),
        description: input.description.trim() || null,
        templateKind: getTemplateKind(input.templateId),
        strategyKey:
          input.scope?.strategyKey && input.scope.strategyKey !== "custom"
            ? getStrategyKey(input.scope.strategyKey)
            : null,
        entityType:
          input.scope?.entityType === "team"
            ? "TEAM"
            : input.scope?.entityType === "player"
              ? "PLAYER"
              : null,
        entityExternalId: input.scope?.entityId || null,
        entityName: input.scope?.entityName || null,
        entitySubtitle: input.scope?.entitySubtitle || null,
        entityTeamExternalId: input.scope?.entityTeamId || null,
        entityTeamName: input.scope?.entityTeamName || null,
        opponentExternalId: input.scope?.opponentId || null,
        opponentName: input.scope?.opponentName || null,
        season: input.scope?.season ?? null,
        matchupLabel: input.templateName,
        widgets: {
          create: buildWidgetCreateData(input, layoutById, entityType),
        },
      },
      include: {
        widgets: {
          orderBy: [
            { positionY: "asc" },
            { positionX: "asc" },
            { createdAt: "asc" },
          ],
      },
    },
  })
})

  return toStoredDashboard(dashboard)
}

export async function archiveDashboardForUser(userId: string, id: string) {
  const existing = await prisma.dashboard.findFirst({
    where: { id, userId, isArchived: false },
    select: { id: true },
  })
  if (!existing) return false
  await prisma.dashboard.update({
    where: { id },
    data: { isArchived: true },
  })
  return true
}

export async function updateDashboardNameForUser(
  userId: string,
  id: string,
  name: string
) {
  const existing = await prisma.dashboard.findFirst({
    where: { id, userId, isArchived: false },
    select: { id: true },
  })
  if (!existing) return null
  const dashboard = await prisma.dashboard.update({
    where: { id },
    data: { name: name.trim() || "Untitled dashboard" },
    include: {
      widgets: {
        orderBy: [{ positionY: "asc" }, { positionX: "asc" }, { createdAt: "asc" }],
      },
    },
  })
  return toStoredDashboard(dashboard)
}

export async function setDashboardTemplateForUser(
  userId: string,
  id: string,
  isTemplate: boolean
) {
  const existing = await prisma.dashboard.findFirst({
    where: { id, userId, isArchived: false },
    select: { id: true },
  })
  if (!existing) return false
  await prisma.dashboard.update({
    where: { id },
    data: { isTemplate },
  })
  return true
}

export async function listTemplatesForUser(userId: string) {
  const dashboards = await prisma.dashboard.findMany({
    where: { userId, isArchived: false, isTemplate: true },
    include: {
      widgets: {
        orderBy: [{ positionY: "asc" }, { positionX: "asc" }, { createdAt: "asc" }],
      },
    },
    orderBy: { updatedAt: "desc" },
  })
  return dashboards.map(toStoredDashboard)
}
