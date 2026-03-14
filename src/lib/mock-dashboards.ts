export type TrendPoint = {
  label: string
  value: number
}

export type DashboardWidget = {
  id: string
  title: string
  subtitle: string
  statLabel: string
  statValue: string
  delta: string
  deltaTone: "up" | "down" | "neutral"
  bullets: string[]
  trend: TrendPoint[]
}

export type DashboardRecord = {
  id: string
  name: string
  summary: string
  focus: string
  matchup: string
  updatedAt: string
  tags: string[]
  widgets: DashboardWidget[]
}

export type DashboardTemplate = {
  id: string
  name: string
  description: string
  idealFor: string
  widgets: string[]
}

export const dashboardTemplates: DashboardTemplate[] = [
  {
    id: "nba-player-props",
    name: "NBA Player Props",
    description:
      "Track the exact questions people ask before betting overs, unders, and combo props.",
    idealFor: "Points, rebounds, assists, PRA, and opponent-specific player spots.",
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
    widgets: [
      "Projected starters",
      "Injury notes",
      "Team trend cards",
      "Player spotlight widgets",
      "Game script reminders",
    ],
  },
]

export const sampleDashboards: DashboardRecord[] = [
  {
    id: "friday-player-props-lab",
    name: "Friday Player Props Lab",
    summary:
      "A reusable board for checking scorer trends, matchup splits, and fatigue angles before locking props.",
    focus: "Player props",
    matchup: "Knicks at Celtics",
    updatedAt: "Updated 12 minutes ago",
    tags: ["NBA", "Points", "Away splits"],
    widgets: [
      {
        id: "brunson-scoring-trend",
        title: "Jalen Brunson scoring trend",
        subtitle: "Last 10 games with home and away context",
        statLabel: "Avg points",
        statValue: "28.4",
        delta: "+3.8 vs season average",
        deltaTone: "up",
        bullets: [
          "Cleared 25 points in 7 of the last 10 games.",
          "Away scoring is down slightly, but usage rate has held steady.",
          "Boston has allowed more guard pull-up volume lately than their season baseline.",
        ],
        trend: [
          { label: "G1", value: 21 },
          { label: "G2", value: 31 },
          { label: "G3", value: 25 },
          { label: "G4", value: 29 },
          { label: "G5", value: 33 },
          { label: "G6", value: 24 },
          { label: "G7", value: 35 },
          { label: "G8", value: 27 },
          { label: "G9", value: 30 },
          { label: "G10", value: 29 },
        ],
      },
      {
        id: "road-fatigue-check",
        title: "Road fatigue check",
        subtitle: "Travel and rest context for the visiting team",
        statLabel: "Rest days",
        statValue: "1",
        delta: "Third road game in four nights",
        deltaTone: "down",
        bullets: [
          "Knicks are finishing a compact road stretch.",
          "This is the team's third city in four nights.",
          "Bench minutes have risen in second halves on similar travel spots.",
        ],
        trend: [
          { label: "Mon", value: 34 },
          { label: "Tue", value: 31 },
          { label: "Wed", value: 29 },
          { label: "Thu", value: 27 },
          { label: "Fri", value: 25 },
        ],
      },
      {
        id: "opponent-guard-defense",
        title: "Opponent guard defense",
        subtitle: "How Boston has defended primary ball handlers recently",
        statLabel: "Pts allowed",
        statValue: "24.1",
        delta: "-1.2 vs season average",
        deltaTone: "neutral",
        bullets: [
          "Primary creators are still generating assists against this defense.",
          "Boston is forcing more mid-range shots than rim attempts.",
          "Live with slightly lower points if assist volume is part of the card.",
        ],
        trend: [
          { label: "W1", value: 25 },
          { label: "W2", value: 24 },
          { label: "W3", value: 23 },
          { label: "W4", value: 26 },
          { label: "W5", value: 24 },
        ],
      },
    ],
  },
  {
    id: "road-trip-spotter",
    name: "Road Trip Spotter",
    summary:
      "A team-first board for quickly spotting fatigue, pace, and form edges before betting sides or totals.",
    focus: "Sides and totals",
    matchup: "Suns at Timberwolves",
    updatedAt: "Updated 43 minutes ago",
    tags: ["NBA", "Road trips", "Pace"],
    widgets: [
      {
        id: "team-form",
        title: "Minnesota recent form",
        subtitle: "Last five game scoring margin",
        statLabel: "Avg margin",
        statValue: "+8.6",
        delta: "4 straight wins",
        deltaTone: "up",
        bullets: [
          "Defense has held opponents under 110 in four of the last five.",
          "Pace has stayed moderate, which matters for totals.",
          "Starters are playing cleaner fourth-quarter possessions at home.",
        ],
        trend: [
          { label: "G1", value: 6 },
          { label: "G2", value: 9 },
          { label: "G3", value: 11 },
          { label: "G4", value: 5 },
          { label: "G5", value: 12 },
        ],
      },
      {
        id: "travel-load",
        title: "Phoenix travel load",
        subtitle: "Road sequence and schedule density",
        statLabel: "Road games",
        statValue: "4",
        delta: "Four-game trip wraps tonight",
        deltaTone: "down",
        bullets: [
          "This is the final stop on a four-game trip.",
          "The Suns have played every other day for over a week.",
          "Late-game pace has dropped in similar travel runs.",
        ],
        trend: [
          { label: "Stop 1", value: 102 },
          { label: "Stop 2", value: 100 },
          { label: "Stop 3", value: 98 },
          { label: "Stop 4", value: 95 },
        ],
      },
    ],
  },
]

export function getDashboardById(id: string) {
  return sampleDashboards.find((dashboard) => dashboard.id === id)
}
