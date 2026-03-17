/**
 * Seeds one "EV edge" dashboard in the DB: Rested Home Favorite.
 *
 * Idea: Teams with a clear rest advantage at home and a stable market
 * (spread/total) tend to cover more often than the market expects.
 *
 * Run: npm run seed:rest   (or npx tsx scripts/seed-rest-edge-dashboard.ts)
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
  strategyKey: "custom",
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
      id: "rest-angle",
      prompt: "show rest edge between the selected team and opponent for the next game",
      title: "Rest edge overview",
      summary: "Core signal: home team with meaningful rest advantage.",
      entityType: "team",
      viewType: "stat",
      metric: "rest_edge",
      aggregation: "latest",
      filters: { ...defaultFilters },
      presentation: { statLabel: "Rest edge", precision: 0, chartType: "line", tableLimit: null },
    }),
    createWidgetSpec({
      id: "rest-margin-home-away",
      prompt: "compare team margin in home games vs away games",
      title: "Margin home vs away",
      summary: "How the team performs at home vs on the road.",
      entityType: "team",
      viewType: "comparison",
      metric: "margin",
      aggregation: "compare_average",
      filters: { ...defaultFilters, subjectVenue: "home" },
      comparison: {
        label: "Away games",
        aggregation: "average",
        filters: { ...defaultFilters, subjectVenue: "away" },
      },
      presentation: { statLabel: "Margin", precision: 1, chartType: "bar", tableLimit: null },
    }),
    createWidgetSpec({
      id: "rest-home-trend",
      prompt: "show team points trend over the last 10 home games",
      title: "Home scoring trend",
      summary: "Recent scoring at home.",
      entityType: "team",
      viewType: "trend",
      metric: "team_points",
      aggregation: "average",
      filters: {
        ...defaultFilters,
        subjectVenue: "home",
        sampleMode: "last_n",
        sampleSize: 10,
      },
      presentation: { statLabel: "Pts", precision: 1, chartType: "line", tableLimit: null },
    }),
    createWidgetSpec({
      id: "rest-road-trend",
      prompt: "show team points trend over the last 10 away games",
      title: "Road scoring trend",
      summary: "Recent scoring on the road.",
      entityType: "team",
      viewType: "trend",
      metric: "team_points",
      aggregation: "average",
      filters: {
        ...defaultFilters,
        subjectVenue: "away",
        sampleMode: "last_n",
        sampleSize: 10,
      },
      presentation: { statLabel: "Pts", precision: 1, chartType: "line", tableLimit: null },
    }),
    createWidgetSpec({
      id: "rest-spread",
      prompt: "show current spread and market context",
      title: "Spread & move",
      summary: "Current spread and any move from open.",
      entityType: "team",
      viewType: "stat",
      metric: "spread",
      aggregation: "latest",
      filters: defaultFilters,
      presentation: { statLabel: "Spread", precision: 1, chartType: "line", tableLimit: null },
    }),
    createWidgetSpec({
      id: "rest-total",
      prompt: "show current total and over/under market",
      title: "Total (O/U)",
      summary: "Total points line and movement.",
      entityType: "team",
      viewType: "stat",
      metric: "total",
      aggregation: "latest",
      filters: defaultFilters,
      presentation: { statLabel: "Total", precision: 1, chartType: "line", tableLimit: null },
    }),
    createWidgetSpec({
      id: "rest-scoreboard",
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
      id: "rest-injuries",
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
  // Row 1: rest edge (6) + margin comparison (8)
  layout.push({ i: specs[0].id, x: 0, y: 0, w: 6, h: 4 })
  layout.push({ i: specs[1].id, x: 6, y: 0, w: 8, h: 4 })
  // Row 2: home trend (7) + road trend (7)
  layout.push({ i: specs[2].id, x: 0, y: 4, w: 7, h: 4 })
  layout.push({ i: specs[3].id, x: 7, y: 4, w: 7, h: 4 })
  // Row 3: spread (7) + total (7)
  layout.push({ i: specs[4].id, x: 0, y: 8, w: 7, h: 3 })
  layout.push({ i: specs[5].id, x: 7, y: 8, w: 7, h: 3 })
  // Row 4: scoreboard (8) + injuries (6)
  layout.push({ i: specs[6].id, x: 0, y: 11, w: 8, h: 3 })
  layout.push({ i: specs[7].id, x: 8, y: 11, w: 6, h: 3 })
  return layout
}

async function main() {
  const widgetSpecs = buildSpecs()
  const layout = buildLayout()

  const dashboard = await createStoredDashboardForUser(PREVIEW_USER_ID, {
    name: "EV edge: Rested Home Favorite",
    description:
      "Rule of thumb: look to back home teams with a clear rest advantage, strong home vs road margin, and a spread/total that has not already fully priced in the edge. Start with rest edge, confirm with home/away margin and recent home scoring, then check market and injuries.",
    templateId: "nba-team-matchup",
    templateName: "Rested Home Favorite",
    scope,
    widgetSpecs,
    panels: [],
    layout,
  })

  console.log("Created Rest edge dashboard:", dashboard.id)
  console.log("URL (preview user): /dashboard/" + dashboard.id)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

