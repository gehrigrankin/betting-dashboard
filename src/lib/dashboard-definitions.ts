import type {
  DashboardEntityType,
  DashboardStrategyKey,
} from "@/lib/dashboard-builder"

export type RecommendationTier = {
  minScore: number
  headline: string
  summary: string
  tone: "up" | "down" | "neutral"
  confidence: "High" | "Medium" | "Low"
}

export type TeamRecommendationModel = {
  liveSpotWeight: number
  opponentRestEdgeWeight: number
  betterRestWeight: number
  negativeSampleWeight: number
  positiveSampleWeight: number
  scoringDropWeight: number
  marketMoveAgainstWeight: number
  marketMoveTowardWeight: number
  tiers: RecommendationTier[]
  fallback: RecommendationTier
}

export type PlayerRecommendationModel = {
  liveSpotWeight: number
  opponentRestEdgeWeight: number
  weakerSplitWeight: number
  strongerSplitWeight: number
 lineAboveAverageWeight: number
  lineBelowAverageWeight: number
  lineBetUpWeight: number
  lineBetDownWeight: number
  tiers: RecommendationTier[]
  fallback: RecommendationTier
}

export type DashboardStrategyDefinition = {
  key: DashboardStrategyKey
  name: string
  description: string
  idealFor: string
  supportedEntityTypes: DashboardEntityType[]
  widgetLabels: string[]
  starterPrompts?: Partial<Record<DashboardEntityType, string[]>>
  recommendationModel?: {
    team: TeamRecommendationModel
    player: PlayerRecommendationModel
  }
}

export const dashboardStrategyDefinitions: DashboardStrategyDefinition[] = [
  {
    key: "custom",
    name: "Custom board",
    description:
      "Start from a blank research board and add your own notes, metrics, and checklists.",
    idealFor: "Freeform prep boards and custom workflows.",
    supportedEntityTypes: ["team", "player"],
    widgetLabels: ["Quick notes", "Checklist", "One-off metric"],
    starterPrompts: {
      team: [
        "show team points over the last 10 games",
        "compare team margin in away games vs home games",
      ],
      player: [
        "show player points over the last 10 games",
        "table of player rebounds in recent away games",
      ],
    },
  },
  {
    key: "away_after_away_fade",
    name: "Away-to-Away Fade",
    description:
      "Track whether a team or player is entering another road game after their previous game was also away.",
    idealFor:
      "Travel-fade routines, short-rest road spots, and away-sequence context.",
    supportedEntityTypes: ["team", "player"],
    widgetLabels: [
      "Away-to-away spot history",
      "Current travel stress",
      "Away vs home split",
      "Recent form trend",
      "Opponent freshness edge",
    ],
    starterPrompts: {
      team: [
        "recommend fade based on away after away signals",
        "compare team margin in away after away spots vs all road games",
        "show team points trend in away after away games",
        "show current spread and market context",
      ],
      player: [
        "recommend player under based on away after away signals",
        "show player points in away after away games this season",
        "compare player points in away after away spots vs season average",
        "show current player prop line",
      ],
    },
    recommendationModel: {
      team: {
        liveSpotWeight: 2,
        opponentRestEdgeWeight: 2,
        betterRestWeight: -1,
        negativeSampleWeight: 2,
        positiveSampleWeight: -1,
        scoringDropWeight: 1,
        marketMoveAgainstWeight: 1,
        marketMoveTowardWeight: -1,
        tiers: [
          {
            minScore: 5,
            headline: "Strong fade {team}",
            summary: "Several signals line up against the road team.",
            tone: "down",
            confidence: "High",
          },
          {
            minScore: 3,
            headline: "Lean fade {team}",
            summary: "The travel angle looks live, but not overwhelming.",
            tone: "down",
            confidence: "Medium",
          },
        ],
        fallback: {
          minScore: Number.NEGATIVE_INFINITY,
          headline: "Pass for now",
          summary: "The travel routine does not have enough support yet.",
          tone: "neutral",
          confidence: "Low",
        },
      },
      player: {
        liveSpotWeight: 2,
        opponentRestEdgeWeight: 1,
        weakerSplitWeight: 2,
        strongerSplitWeight: -1,
        lineAboveAverageWeight: 2,
        lineBelowAverageWeight: -1,
        lineBetUpWeight: 1,
        lineBetDownWeight: -1,
        tiers: [
          {
            minScore: 5,
            headline: "Lean under {player}",
            summary:
              "The travel angle and line positioning both support an under look.",
            tone: "down",
            confidence: "High",
          },
          {
            minScore: 3,
            headline: "Small under lean",
            summary: "There is some edge, but it is not a slam-dunk spot.",
            tone: "down",
            confidence: "Medium",
          },
        ],
        fallback: {
          minScore: Number.NEGATIVE_INFINITY,
          headline: "Pass for now",
          summary: "The prop line is not stretched enough versus the travel data.",
          tone: "neutral",
          confidence: "Low",
        },
      },
    },
  },
]

const strategyByKey = new Map(
  dashboardStrategyDefinitions.map((strategy) => [strategy.key, strategy])
)

export function getDashboardStrategyDefinition(
  key: DashboardStrategyKey | null | undefined
) {
  if (!key) {
    return strategyByKey.get("custom")!
  }

  return strategyByKey.get(key) ?? strategyByKey.get("custom")!
}

export function getStrategyForTemplate(templateId: string): DashboardStrategyKey {
  switch (templateId) {
    case "away-to-away-fade":
      return "away_after_away_fade"
    default:
      return "custom"
  }
}
