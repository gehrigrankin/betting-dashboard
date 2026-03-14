import type { Prisma } from "@prisma/client"
import type {
  DashboardPanel,
  GridItemLayout,
  StoredDashboard,
} from "@/lib/dashboard-builder"
import { prisma } from "@/lib/db"

type DashboardWriteInput = {
  name: string
  description: string
  templateId: string
  templateName: string
  panels: DashboardPanel[]
  layout: GridItemLayout[]
}

const PREVIEW_USER_ID = "preview-user"

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

function getTemplateId(templateKind: string) {
  switch (templateKind) {
    case "NBA_PLAYER_PROPS":
      return "nba-player-props"
    case "NBA_TEAM_MATCHUP":
      return "nba-team-matchup"
    case "NBA_GAME_PREP":
      return "nba-game-prep"
    default:
      return "custom"
  }
}

function toStoredDashboard(dashboard: {
  id: string
  name: string
  description: string | null
  createdAt: Date
  updatedAt: Date
  templateKind: string
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
  const panels: DashboardPanel[] = dashboard.widgets.map((widget) => {
    const config = parseWidgetConfig(widget.config)

    return {
      id: widget.id,
      title: widget.title,
      description: config.description,
      value: config.value,
      kind: config.kind,
      tone: config.tone,
      notes: config.notes,
    }
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
    createdAt: dashboard.createdAt.toISOString(),
    updatedAt: dashboard.updatedAt.toISOString(),
    panels,
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
  const dashboards = await prisma.dashboard.findMany({
    where: {
      userId: PREVIEW_USER_ID,
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
  const dashboard = await prisma.dashboard.findFirst({
    where: {
      id,
      userId: PREVIEW_USER_ID,
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
  await ensurePreviewUser()

  const layoutById = new Map(input.layout.map((item) => [item.i, item]))
  const dashboard = await prisma.dashboard.create({
    data: {
      userId: PREVIEW_USER_ID,
      name: input.name.trim(),
      description: input.description.trim() || null,
      templateKind: getTemplateKind(input.templateId),
      matchupLabel: input.templateName,
      widgets: {
        create: input.panels.map((panel) => {
          const layout = layoutById.get(panel.id)

          return {
            type: "NOTES",
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
        }),
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
  const existingDashboard = await prisma.dashboard.findFirst({
    where: {
      id,
      userId: PREVIEW_USER_ID,
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
        matchupLabel: input.templateName,
        widgets: {
          create: input.panels.map((panel) => {
            const layout = layoutById.get(panel.id)

            return {
              type: "NOTES",
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
          }),
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
