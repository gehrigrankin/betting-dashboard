/**
 * Seeds one "EV edge" dashboard in the DB: Away-to-Away Fade strategy
 * (repeat road spots + rest/market context) for best odds of making money.
 *
 * Run: npm run seed:ev   (or npx tsx scripts/seed-ev-dashboard.ts)
 * Requires DATABASE_URL (e.g. in .env). Uses PREVIEW_USER_ID so it appears without auth.
 */

import "dotenv/config"
import { createWidgetSpec } from "../src/lib/widget-spec"
import type { DashboardScope, GridItemLayout } from "../src/lib/dashboard-builder"
import type { DashboardWidgetSpec } from "../src/lib/widget-spec"
import { createStoredDashboardForUser } from "../src/lib/dashboard-store"
import { PREVIEW_USER_ID } from "../src/lib/auth"

const SEASON = 2025

// ESPN NBA team ID for Los Angeles Lakers (selector can be changed in the UI)
const DEFAULT_TEAM_ID = "13"
const DEFAULT_TEAM_NAME = "Los Angeles Lakers"

const scope: DashboardScope = {
  sport: "NBA",
  strategyKey: "away_after_away_fade",
  entityType: "team",
  entityId: DEFAULT_TEAM_ID,
  entityName: DEFAULT_TEAM_NAME,
  entitySubtitle: "NBA",
  entityTeamId: DEFAULT_TEAM_ID,
  entityTeamName: DEFAULT_TEAM_NAME,
  opponentId: "",
  opponentName: "",
  season: SEASON,
}

const defaultFilters = {
  seasonMode: "selected" as const,
  sampleMode: "all" as const,
  sampleSize: null as number | null,
  subjectVenue: "any" as const,
  opponentVenue: "any" as const,
  opponentId: "",
  opponentName: "",
  travelSpot: "any" as const,
  completedOnly: true,
}

function buildSpecs(): DashboardWidgetSpec[] {
  return [
    createWidgetSpec({
      id: "ev-angle-read",
      prompt: "recommend fade based on away after away signals",
      title: "Angle read",
      summary: "Fade or play call from travel, rest, sample, and market.",
      entityType: "team",
      viewType: "stat",
      metric: "recommendation",
      aggregation: "none",
      filters: { ...defaultFilters, travelSpot: "away_after_away" },
      presentation: { statLabel: "Call", precision: 0, chartType: "line", tableLimit: null },
    }),
    createWidgetSpec({
      id: "ev-away-after-away-trend",
      prompt: "show team points trend in away after away games",
      title: "Away-after-away trend",
      summary: "Points in repeat road games.",
      entityType: "team",
      viewType: "trend",
      metric: "team_points",
      aggregation: "average",
      filters: { ...defaultFilters, travelSpot: "away_after_away" },
      presentation: { statLabel: "Pts", precision: 1, chartType: "line", tableLimit: null },
    }),
    createWidgetSpec({
      id: "ev-margin-compare",
      prompt: "compare team margin in away games vs home games",
      title: "Margin home/away",
      summary: "Road vs home point differential.",
      entityType: "team",
      viewType: "comparison",
      metric: "margin",
      aggregation: "compare_average",
      filters: { ...defaultFilters, subjectVenue: "away" },
      comparison: {
        label: "Home games",
        aggregation: "average",
        filters: { ...defaultFilters, subjectVenue: "home" },
      },
      presentation: { statLabel: "Margin", precision: 1, chartType: "bar", tableLimit: null },
    }),
    createWidgetSpec({
      id: "ev-spread",
      prompt: "show current spread and market context",
      title: "Spread & market",
      summary: "Live spread and open for next game.",
      entityType: "team",
      viewType: "stat",
      metric: "spread",
      aggregation: "latest",
      filters: defaultFilters,
      presentation: { statLabel: "Spread", precision: 1, chartType: "line", tableLimit: null },
    }),
    createWidgetSpec({
      id: "ev-rest-edge",
      prompt: "show rest edge between the selected team and opponent for the next game",
      title: "Rest edge vs opponent",
      summary: "Rest advantage for next matchup.",
      entityType: "team",
      viewType: "stat",
      metric: "rest_edge",
      aggregation: "latest",
      filters: defaultFilters,
      presentation: { statLabel: "Rest edge", precision: 0, chartType: "line", tableLimit: null },
    }),
    createWidgetSpec({
      id: "ev-road-streak",
      prompt: "show current road streak for the team",
      title: "Road streak",
      summary: "Consecutive road games (current or upcoming).",
      entityType: "team",
      viewType: "stat",
      metric: "road_streak",
      aggregation: "latest",
      filters: defaultFilters,
      presentation: { statLabel: "Road streak", precision: 0, chartType: "line", tableLimit: null },
    }),
    createWidgetSpec({
      id: "ev-scoreboard",
      prompt: "show today's NBA scoreboard",
      title: "Today's scoreboard",
      summary: "Live and upcoming games.",
      entityType: "team",
      viewType: "table",
      metric: "scoreboard",
      aggregation: "none",
      filters: defaultFilters,
      presentation: { statLabel: "Games", precision: 0, chartType: "line", tableLimit: 15 },
    }),
    createWidgetSpec({
      id: "ev-injuries",
      prompt: "show team injury report",
      title: "Injury report",
      summary: "Team availability.",
      entityType: "team",
      viewType: "table",
      metric: "injuries",
      aggregation: "none",
      filters: defaultFilters,
      presentation: { statLabel: "Status", precision: 0, chartType: "line", tableLimit: 10 },
    }),
  ]
}

function buildLayout(): GridItemLayout[] {
  const specs = buildSpecs()
  const layout: GridItemLayout[] = []
  // Row 1: angle (6) + away-after-away trend (8)
  layout.push({ i: specs[0].id, x: 0, y: 0, w: 6, h: 4 })
  layout.push({ i: specs[1].id, x: 6, y: 0, w: 8, h: 4 })
  // Row 2: margin compare (7) + spread (7)
  layout.push({ i: specs[2].id, x: 0, y: 4, w: 7, h: 4 })
  layout.push({ i: specs[3].id, x: 7, y: 4, w: 7, h: 4 })
  // Row 3: rest edge (5) + road streak (4) + scoreboard (5)
  layout.push({ i: specs[4].id, x: 0, y: 8, w: 5, h: 3 })
  layout.push({ i: specs[5].id, x: 5, y: 8, w: 4, h: 3 })
  layout.push({ i: specs[6].id, x: 9, y: 8, w: 5, h: 3 })
  // Row 4: injuries full width
  layout.push({ i: specs[7].id, x: 0, y: 11, w: 14, h: 3 })
  return layout
}

async function main() {
  const widgetSpecs = buildSpecs()
  const layout = buildLayout()

  const dashboard = await createStoredDashboardForUser(PREVIEW_USER_ID, {
    name: "EV edge: Away-to-Away Fade",
    description:
      "One rule with strong historical edge: fade teams (or take the opponent) when they're in a repeat road spot—second straight away game—especially when rest and market context align. Use the angle read, then confirm with rest edge, road streak, and injury report.",
    templateId: "away-to-away-fade",
    templateName: "Away-to-Away Fade",
    scope,
    widgetSpecs,
    panels: [],
    layout,
  })

  console.log("Created EV dashboard:", dashboard.id)
  console.log("URL (preview user): /dashboard/" + dashboard.id)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
