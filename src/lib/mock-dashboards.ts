import type {
  DashboardEntityType,
  DashboardStrategyKey,
} from "@/lib/dashboard-builder"

export type DashboardTemplate = {
  id: string
  name: string
  description: string
  idealFor: string
  strategyKey: DashboardStrategyKey
  entityTypes: DashboardEntityType[]
  widgets: string[]
}

export const dashboardTemplates: DashboardTemplate[] = [
  {
    id: "nba-player-props",
    name: "NBA Player Props",
    description:
      "Track the exact questions people ask before betting overs, unders, and combo props.",
    idealFor: "Points, rebounds, assists, PRA, and opponent-specific player spots.",
    strategyKey: "custom",
    entityTypes: ["player"],
    widgets: [
      "Season average snapshot",
      "Last 5 and last 10 trend",
      "Home and away split",
      "Opponent matchup history",
      "Rest and fatigue context",
    ],
  },
  {
    id: "nba-team-matchup",
    name: "NBA Team Matchup",
    description:
      "Compare team form, travel, pace, and matchup pressure before taking a side.",
    idealFor: "Spreads, moneylines, and totals with team-level context.",
    strategyKey: "custom",
    entityTypes: ["team"],
    widgets: [
      "Recent offensive rating",
      "Road trip and rest days",
      "Home and away form",
      "Pace comparison",
      "Opponent defensive profile",
    ],
  },
  {
    id: "nba-game-prep",
    name: "NBA Game Prep",
    description:
      "Create one board for a single matchup and pull every useful pregame note into one place.",
    idealFor: "Same game parlays and general game research.",
    strategyKey: "custom",
    entityTypes: ["team", "player"],
    widgets: [
      "Projected starters",
      "Injury notes",
      "Team trend cards",
      "Player spotlight widgets",
      "Game script reminders",
    ],
  },
  {
    id: "away-to-away-fade",
    name: "Away-to-Away Fade",
    description:
      "Track teams coming into an away game after a previous away game and decide when the travel spot is worth fading.",
    idealFor:
      "Spreads, moneylines, and first-half fades when schedule fatigue and travel context matter.",
    strategyKey: "away_after_away_fade",
    entityTypes: ["team", "player"],
    widgets: [
      "Away-to-away ATS tracker",
      "Schedule compression check",
      "Rest and travel load snapshot",
      "Opponent freshness comparison",
      "Market line movement notes",
    ],
  },
]
