import {
  getDashboardStrategyDefinition,
  type PlayerRecommendationModel,
  type RecommendationTier,
  type TeamRecommendationModel,
} from "@/lib/dashboard-definitions"
import type { DashboardScope, StoredDashboard } from "@/lib/dashboard-builder"
import type { DashboardWidget, DynamicDashboardView } from "@/lib/dashboard-widgets"
import {
  getNbaGameOdds,
  getNbaPlayerOverview,
  getNbaPlayerPropMarkets,
  getNbaTeamSchedule,
} from "@/lib/sports-provider/client"
import {
  average,
  buildMarginTrend,
  buildPointsTrend,
  formatAverage,
  formatRecord,
  formatSigned,
  getRestDays,
} from "@/lib/sports-provider/normalize"
import type { TeamGameLog } from "@/lib/sports-provider/types"

function getChronologicalGames<T extends { date: string }>(games: T[]) {
  return [...games].sort((left, right) => left.date.localeCompare(right.date))
}

function getRecentGames<T extends { date: string }>(games: T[], limit = 5) {
  return [...games]
    .sort((left, right) => right.date.localeCompare(left.date))
    .slice(0, limit)
}

function getAwayAfterAwayGames<T extends { isHome: boolean; date: string }>(games: T[]) {
  const chronologicalGames = getChronologicalGames(games)

  return chronologicalGames.filter(
    (game, index) => index > 0 && !game.isHome && !chronologicalGames[index - 1].isHome
  )
}

function getCurrentTravelSpot(teamGames: TeamGameLog[]) {
  const chronologicalGames = getChronologicalGames(teamGames)
  const completedGames = chronologicalGames.filter((game) => game.didWin !== null)
  const upcomingGames = chronologicalGames.filter((game) => game.didWin === null)
  const lastCompleted = completedGames.at(-1) ?? null
  const secondLastCompleted = completedGames.at(-2) ?? null
  const nextGame = upcomingGames[0] ?? null

  let roadStreak = 0

  for (let index = completedGames.length - 1; index >= 0; index -= 1) {
    if (completedGames[index]?.isHome) {
      break
    }

    roadStreak += 1
  }

  if (nextGame && !nextGame.isHome) {
    roadStreak += 1
  }

  const subjectGame = nextGame ?? lastCompleted
  const currentSpotIsAwayAfterAway =
    !subjectGame?.isHome && !lastCompleted?.isHome && Boolean(nextGame || secondLastCompleted)

  return {
    nextGame,
    lastCompleted,
    secondLastCompleted,
    roadStreak,
    currentSpotIsAwayAfterAway,
    restDays: subjectGame ? getRestDays(subjectGame.date, lastCompleted?.date ?? null) : null,
  }
}

async function getOpponentRestEdge(
  scope: DashboardScope,
  matchupDate: string | null,
  fallbackOpponentId: string
) {
  const opponentId = scope.opponentId || fallbackOpponentId

  if (!matchupDate || !opponentId) {
    return null
  }

  const opponentGames = await getNbaTeamSchedule(opponentId, scope.season)
  const previousOpponentGame = getChronologicalGames(
    opponentGames.filter((game) => game.didWin !== null && game.date < matchupDate)
  ).at(-1)

  return getRestDays(matchupDate, previousOpponentGame?.date ?? null)
}

function buildOddsTrend(
  currentValue: string | null,
  openValue: string | null
) {
  const parse = (value: string | null) => {
    if (!value) {
      return 0
    }

    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }

  return [
    { label: "Open", value: parse(openValue) },
    { label: "Current", value: parse(currentValue) },
  ]
}

function buildSignalTrend(signals: Array<{ label: string; value: number }>) {
  return signals.map((signal, index) => ({
    label: signal.label || `S${index + 1}`,
    value: signal.value,
  }))
}

function parseLineValue(value: string | null) {
  if (!value) {
    return null
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function resolveRecommendationTier(
  score: number,
  tiers: RecommendationTier[],
  fallback: RecommendationTier
) {
  return tiers.find((tier) => score >= tier.minScore) ?? fallback
}

function getTeamRecommendation(params: {
  config: TeamRecommendationModel
  hasAwayAfterAwaySpot: boolean
  restEdge: number | null
  averageAwayAfterAwayMargin: number | null
  averageAwayAfterAwayPoints: number | null
  averageRoadPoints: number | null
  currentSpread: string | null
  openSpread: string | null
  teamName: string
}) {
  let score = 0
  const reasons: string[] = []
  const signals: Array<{ label: string; value: number }> = []

  if (params.hasAwayAfterAwaySpot) {
    score += params.config.liveSpotWeight
    reasons.push(`${params.teamName} is in a live away-after-away spot.`)
    signals.push({ label: "Travel", value: params.config.liveSpotWeight })
  } else {
    signals.push({ label: "Travel", value: 0 })
  }

  if (params.restEdge !== null) {
    if (params.restEdge > 0) {
      score += params.config.opponentRestEdgeWeight
      reasons.push(`Opponent has a ${params.restEdge}-day rest edge.`)
      signals.push({ label: "Rest", value: params.config.opponentRestEdgeWeight })
    } else if (params.restEdge < 0) {
      score += params.config.betterRestWeight
      reasons.push(`${params.teamName} is actually more rested.`)
      signals.push({ label: "Rest", value: params.config.betterRestWeight })
    } else {
      signals.push({ label: "Rest", value: 0 })
    }
  }

  if (
    params.averageAwayAfterAwayMargin !== null &&
    params.averageAwayAfterAwayMargin < 0
  ) {
    score += params.config.negativeSampleWeight
    reasons.push(
      `Away-after-away sample has a ${formatSigned(params.averageAwayAfterAwayMargin)} scoring margin.`
    )
    signals.push({ label: "Sample", value: params.config.negativeSampleWeight })
  } else if (
    params.averageAwayAfterAwayMargin !== null &&
    params.averageAwayAfterAwayMargin > 0
  ) {
    score += params.config.positiveSampleWeight
    reasons.push("Historical repeat-road sample has still been positive.")
    signals.push({ label: "Sample", value: params.config.positiveSampleWeight })
  } else {
    signals.push({ label: "Sample", value: 0 })
  }

  if (
    params.averageAwayAfterAwayPoints !== null &&
    params.averageRoadPoints !== null &&
    params.averageAwayAfterAwayPoints < params.averageRoadPoints
  ) {
    score += params.config.scoringDropWeight
    reasons.push("Scoring output drops below the normal road baseline in this spot.")
    signals.push({ label: "Split", value: params.config.scoringDropWeight })
  } else {
    signals.push({ label: "Split", value: 0 })
  }

  const currentSpread = parseLineValue(params.currentSpread)
  const openSpread = parseLineValue(params.openSpread)

  if (currentSpread !== null && openSpread !== null) {
    if (currentSpread > openSpread) {
      score += params.config.marketMoveAgainstWeight
      reasons.push("The market has moved further against the team.")
      signals.push({ label: "Market", value: params.config.marketMoveAgainstWeight })
    } else if (currentSpread < openSpread) {
      score += params.config.marketMoveTowardWeight
      reasons.push("The market has moved toward the team, which softens the fade.")
      signals.push({ label: "Market", value: params.config.marketMoveTowardWeight })
    } else {
      signals.push({ label: "Market", value: 0 })
    }
  } else {
    signals.push({ label: "Market", value: 0 })
  }

  const tier = resolveRecommendationTier(score, params.config.tiers, params.config.fallback)

  return {
    headline: tier.headline.replace("{team}", params.teamName),
    summary: tier.summary,
    tone: tier.tone,
    confidence: tier.confidence,
    reasons:
      reasons.length > 0 ? reasons : ["The board does not show enough stacked pressure."],
    signals,
    score,
  }
}

function getPlayerRecommendation(params: {
  config: PlayerRecommendationModel
  playerName: string
  hasAwayAfterAwaySpot: boolean
  restEdge: number | null
  awayAfterAwayAverage: number | null
  seasonAverage: number | null
  currentPropLine: string | null
  openPropLine: string | null
}) {
  let score = 0
  const reasons: string[] = []
  const signals: Array<{ label: string; value: number }> = []

  if (params.hasAwayAfterAwaySpot) {
    score += params.config.liveSpotWeight
    reasons.push(`${params.playerName} is attached to a repeat-road team spot.`)
    signals.push({ label: "Travel", value: params.config.liveSpotWeight })
  } else {
    signals.push({ label: "Travel", value: 0 })
  }

  if (params.restEdge !== null) {
    if (params.restEdge > 0) {
      score += params.config.opponentRestEdgeWeight
      reasons.push(`Opponent has a ${params.restEdge}-day rest edge.`)
      signals.push({ label: "Rest", value: params.config.opponentRestEdgeWeight })
    } else {
      signals.push({ label: "Rest", value: 0 })
    }
  }

  if (
    params.awayAfterAwayAverage !== null &&
    params.seasonAverage !== null &&
    params.awayAfterAwayAverage < params.seasonAverage
  ) {
    score += params.config.weakerSplitWeight
    reasons.push(
      `Away-after-away average is ${formatAverage(params.awayAfterAwayAverage)} vs ${formatAverage(params.seasonAverage)} season average.`
    )
    signals.push({ label: "Split", value: params.config.weakerSplitWeight })
  } else if (
    params.awayAfterAwayAverage !== null &&
    params.seasonAverage !== null &&
    params.awayAfterAwayAverage > params.seasonAverage
  ) {
    score += params.config.strongerSplitWeight
    reasons.push("Repeat-road sample has still held above the season baseline.")
    signals.push({ label: "Split", value: params.config.strongerSplitWeight })
  } else {
    signals.push({ label: "Split", value: 0 })
  }

  const currentLine = parseLineValue(params.currentPropLine)
  const openLine = parseLineValue(params.openPropLine)

  if (
    currentLine !== null &&
    params.awayAfterAwayAverage !== null &&
    currentLine > params.awayAfterAwayAverage
  ) {
    score += params.config.lineAboveAverageWeight
    reasons.push("Current prop line sits above the repeat-road average.")
    signals.push({ label: "Line", value: params.config.lineAboveAverageWeight })
  } else if (
    currentLine !== null &&
    params.awayAfterAwayAverage !== null &&
    currentLine < params.awayAfterAwayAverage
  ) {
    score += params.config.lineBelowAverageWeight
    reasons.push("Current prop line is already below the repeat-road average.")
    signals.push({ label: "Line", value: params.config.lineBelowAverageWeight })
  } else {
    signals.push({ label: "Line", value: 0 })
  }

  if (currentLine !== null && openLine !== null) {
    if (currentLine > openLine) {
      score += params.config.lineBetUpWeight
      reasons.push("The prop line has been bet up since open.")
      signals.push({ label: "Market", value: params.config.lineBetUpWeight })
    } else if (currentLine < openLine) {
      score += params.config.lineBetDownWeight
      signals.push({ label: "Market", value: params.config.lineBetDownWeight })
    } else {
      signals.push({ label: "Market", value: 0 })
    }
  } else {
    signals.push({ label: "Market", value: 0 })
  }

  const tier = resolveRecommendationTier(score, params.config.tiers, params.config.fallback)

  return {
    headline: tier.headline.replace("{player}", params.playerName),
    summary: tier.summary,
    tone: tier.tone,
    confidence: tier.confidence,
    reasons:
      reasons.length > 0 ? reasons : ["The board does not show enough separation from the line."],
    signals,
    score,
  }
}

async function buildTeamAwayAfterAwayView(
  dashboard: StoredDashboard,
  scope: DashboardScope
) {
  const strategy = getDashboardStrategyDefinition(scope.strategyKey)
  const teamGames = await getNbaTeamSchedule(scope.entityId, scope.season)
  const completedGames = teamGames.filter((game) => game.didWin !== null)
  const roadGames = completedGames.filter((game) => !game.isHome)
  const awayAfterAwayGames = getAwayAfterAwayGames(completedGames)
  const recentAwayAfterAwayGames = getRecentGames(awayAfterAwayGames, 5)
  const currentSpot = getCurrentTravelSpot(teamGames)
  const wins = awayAfterAwayGames.filter((game) => game.didWin).length
  const losses = awayAfterAwayGames.filter((game) => game.didWin === false).length
  const averageAwayAfterAwayMargin = average(
    awayAfterAwayGames.map((game) =>
      game.teamScore !== null && game.opponentScore !== null
        ? game.teamScore - game.opponentScore
        : null
    )
  )
  const averageRoadPoints = average(roadGames.map((game) => game.teamScore))
  const averageAwayAfterAwayPoints = average(
    awayAfterAwayGames.map((game) => game.teamScore)
  )
  const opponentRestDays = await getOpponentRestEdge(
    scope,
    currentSpot.nextGame?.date ?? currentSpot.lastCompleted?.date ?? null,
    currentSpot.nextGame?.opponentId ?? ""
  )
  const restEdge =
    opponentRestDays !== null && currentSpot.restDays !== null
      ? opponentRestDays - currentSpot.restDays
      : null
  const marketOdds =
    currentSpot.nextGame?.id
      ? await getNbaGameOdds(currentSpot.nextGame.id, scope.entityId)
      : null
  const recommendation = getTeamRecommendation({
    config: strategy.recommendationModel?.team ?? {
      liveSpotWeight: 2,
      opponentRestEdgeWeight: 2,
      betterRestWeight: -1,
      negativeSampleWeight: 2,
      positiveSampleWeight: -1,
      scoringDropWeight: 1,
      marketMoveAgainstWeight: 1,
      marketMoveTowardWeight: -1,
      tiers: [],
      fallback: {
        minScore: Number.NEGATIVE_INFINITY,
        headline: "Pass for now",
        summary: "The travel routine does not have enough support yet.",
        tone: "neutral",
        confidence: "Low",
      },
    },
    hasAwayAfterAwaySpot: currentSpot.currentSpotIsAwayAfterAway,
    restEdge,
    averageAwayAfterAwayMargin,
    averageAwayAfterAwayPoints,
    averageRoadPoints,
    currentSpread: marketOdds?.spread ?? null,
    openSpread: marketOdds?.openSpread ?? null,
    teamName: scope.entityName,
  })
  const widgets: DashboardWidget[] = [
    {
      id: "team-angle-read",
      title: "Angle read",
      subtitle: "Recommendation generated from travel, rest, sample, and market signals",
      statLabel: "Call",
      statValue: recommendation.headline,
      delta: `${recommendation.confidence} confidence`,
      deltaTone: recommendation.tone,
      bullets: [
        recommendation.summary,
        ...recommendation.reasons.slice(0, 2),
      ],
      trend: buildSignalTrend(recommendation.signals),
    },
    {
      id: "away-after-away-record",
      title: "Away-after-away sample",
      subtitle: "How the team performs when a road game follows another road game",
      statLabel: "Record",
      statValue: formatRecord(wins, losses),
      delta: `${formatSigned(averageAwayAfterAwayMargin)} avg scoring margin`,
      deltaTone:
        averageAwayAfterAwayMargin === null
          ? "neutral"
          : averageAwayAfterAwayMargin > 0
            ? "up"
            : "down",
      bullets: [
        `${awayAfterAwayGames.length} completed away-after-away games were found in the ${scope.season} season sample.`,
        `${scope.entityName} has averaged ${formatAverage(averageAwayAfterAwayPoints)} points in those spots.`,
        "Use this with price and matchup context, since this board is stat-driven rather than odds-driven.",
      ],
      trend: buildMarginTrend(recentAwayAfterAwayGames),
    },
    {
      id: "road-offense-split",
      title: "Road scoring dip",
      subtitle: "Away-after-away points compared with the broader road baseline",
      statLabel: "Avg points",
      statValue: formatAverage(averageAwayAfterAwayPoints),
      delta: `${formatSigned(
        averageAwayAfterAwayPoints !== null && averageRoadPoints !== null
          ? averageAwayAfterAwayPoints - averageRoadPoints
          : null
      )} vs all road games`,
      deltaTone:
        averageAwayAfterAwayPoints !== null &&
        averageRoadPoints !== null &&
        averageAwayAfterAwayPoints < averageRoadPoints
          ? "down"
          : "neutral",
      bullets: [
        `${scope.entityName} averages ${formatAverage(averageRoadPoints)} points across all road games.`,
        "When this figure is clearly below the normal road baseline, the fade case gets cleaner.",
        "If the offense holds steady despite the travel spot, the routine may need a stronger matchup filter.",
      ],
      trend: recentAwayAfterAwayGames.map((game, index) => ({
        label: `R${index + 1}`,
        value: game.teamScore ?? 0,
      })),
    },
    {
      id: "travel-context",
      title: "Current travel context",
      subtitle: "What the present road sequence looks like right now",
      statLabel: "Road streak",
      statValue: `${currentSpot.roadStreak}`,
      delta:
        currentSpot.nextGame && currentSpot.restDays !== null
          ? `${currentSpot.restDays} day rest before ${currentSpot.nextGame.opponentName}`
          : currentSpot.currentSpotIsAwayAfterAway
            ? "Latest completed game also came after a road game"
            : "No active away-after-away spot right now",
      deltaTone: currentSpot.currentSpotIsAwayAfterAway ? "down" : "neutral",
      bullets: [
        currentSpot.nextGame
          ? `Next game: ${currentSpot.nextGame.isHome ? "home" : "away"} vs ${currentSpot.nextGame.opponentName}.`
          : "No upcoming regular-season game was found in the current schedule snapshot.",
        currentSpot.lastCompleted
          ? `Previous game was ${currentSpot.lastCompleted.isHome ? "home" : "away"} vs ${currentSpot.lastCompleted.opponentName}.`
          : "No completed games were found for the current season sample.",
        "The best fade spots usually stack repeated travel with short rest or a fresher opponent.",
      ],
      trend: buildMarginTrend(getRecentGames(completedGames, 5)),
    },
    {
      id: "opponent-rest-edge",
      title: "Opponent freshness edge",
      subtitle: "Whether the other side enters the matchup with cleaner rest",
      statLabel: "Rest edge",
      statValue:
        restEdge === null
          ? "--"
          : `${restEdge > 0 ? "+" : ""}${restEdge} day${Math.abs(restEdge) === 1 ? "" : "s"}`,
      delta:
        restEdge === null
          ? "No opponent rest comparison available yet"
          : restEdge > 0
            ? "Opponent is more rested"
            : restEdge < 0
              ? `${scope.entityName} is more rested`
              : "Rest is even",
      deltaTone: restEdge !== null && restEdge > 0 ? "down" : "neutral",
      bullets: [
        `Opponent: ${scope.opponentName || currentSpot.nextGame?.opponentName || "Not selected yet"}.`,
        "A positive rest edge against the target team strengthens the away-after-away fade case.",
        "This widget uses schedule spacing only, without bookmaker line context.",
      ],
      trend: buildMarginTrend(getRecentGames(roadGames, 5)),
    },
    {
      id: "market-line-context",
      title: "Market line context",
      subtitle: "Current spread and total for the live matchup",
      statLabel: "Spread",
      statValue: marketOdds?.spread ?? "--",
      delta:
        marketOdds?.openSpread && marketOdds.spread
          ? `${marketOdds.openSpread} open to ${marketOdds.spread} now`
          : marketOdds?.details ?? "Live line not available yet",
      deltaTone:
        currentSpot.currentSpotIsAwayAfterAway && Boolean(marketOdds?.spread)
          ? "down"
          : "neutral",
      bullets: [
        `Moneyline: ${marketOdds?.moneyline ?? "--"} | Total: ${marketOdds?.total ?? "--"}.`,
        `Book: ${marketOdds?.provider ?? "Unavailable"}${marketOdds?.spreadOdds ? ` | Spread price ${marketOdds.spreadOdds}` : ""}.`,
        "This helps you see whether the market is already pricing in the travel fade.",
      ],
      trend: buildOddsTrend(marketOdds?.spread ?? null, marketOdds?.openSpread ?? null),
    },
  ]

  return {
    title: dashboard.name,
    summary:
      currentSpot.currentSpotIsAwayAfterAway && currentSpot.nextGame
        ? `${scope.entityName} is heading into another road game after already playing away in the previous spot.`
        : `${scope.entityName} is being tracked for repeat-road patterns and short-rest travel spots.`,
    tags: [
      "NBA",
      strategy.name,
      scope.entityName,
      scope.opponentName || currentSpot.nextGame?.opponentName || "Open opponent",
    ],
    widgets,
  }
}

async function buildPlayerAwayAfterAwayView(
  dashboard: StoredDashboard,
  scope: DashboardScope
) {
  const strategy = getDashboardStrategyDefinition(scope.strategyKey)
  const playerOverview = await getNbaPlayerOverview(scope.entityId, {
    name: scope.entityName,
    position: scope.entitySubtitle.split("•").at(-1)?.trim() ?? "",
    teamId: scope.entityTeamId,
    teamName: scope.entityTeamName,
  })
  const awayGames = playerOverview.gameLogs.filter((game) => !game.isHome)
  const homeGames = playerOverview.gameLogs.filter((game) => game.isHome)
  const awayAfterAwayGames = getAwayAfterAwayGames(playerOverview.gameLogs)
  const recentAwayAfterAwayGames = getRecentGames(awayAfterAwayGames, 5)
  const teamGames = scope.entityTeamId
    ? await getNbaTeamSchedule(scope.entityTeamId, scope.season)
    : []
  const currentSpot = getCurrentTravelSpot(teamGames)
  const opponentRestDays = await getOpponentRestEdge(
    scope,
    currentSpot.nextGame?.date ?? currentSpot.lastCompleted?.date ?? null,
    currentSpot.nextGame?.opponentId ?? ""
  )
  const restEdge =
    opponentRestDays !== null && currentSpot.restDays !== null
      ? opponentRestDays - currentSpot.restDays
      : null
  const awayAfterAwayPoints = average(awayAfterAwayGames.map((game) => game.points))
  const awayAfterAwayRebounds = average(awayAfterAwayGames.map((game) => game.rebounds))
  const awayAfterAwayAssists = average(awayAfterAwayGames.map((game) => game.assists))
  const awayPoints = average(awayGames.map((game) => game.points))
  const homePoints = average(homeGames.map((game) => game.points))
  const recentPoints = getRecentGames(playerOverview.gameLogs, 5)
  const marketOdds =
    currentSpot.nextGame?.id && scope.entityTeamId
      ? await getNbaGameOdds(currentSpot.nextGame.id, scope.entityTeamId)
      : null
  const playerPropMarkets =
    currentSpot.nextGame?.id && scope.entityTeamId
      ? await getNbaPlayerPropMarkets(
          currentSpot.nextGame.id,
          scope.entityTeamId,
          scope.entityId
        )
      : []
  const pointsProp =
    playerPropMarkets.find((market) => market.marketName === "Points") ??
    playerPropMarkets[0] ??
    null
  const recommendation = getPlayerRecommendation({
    config: strategy.recommendationModel?.player ?? {
      liveSpotWeight: 2,
      opponentRestEdgeWeight: 1,
      weakerSplitWeight: 2,
      strongerSplitWeight: -1,
      lineAboveAverageWeight: 2,
      lineBelowAverageWeight: -1,
      lineBetUpWeight: 1,
      lineBetDownWeight: -1,
      tiers: [],
      fallback: {
        minScore: Number.NEGATIVE_INFINITY,
        headline: "Pass for now",
        summary: "The prop line is not stretched enough versus the travel data.",
        tone: "neutral",
        confidence: "Low",
      },
    },
    playerName: scope.entityName,
    hasAwayAfterAwaySpot: currentSpot.currentSpotIsAwayAfterAway,
    restEdge,
    awayAfterAwayAverage: awayAfterAwayPoints,
    seasonAverage: playerOverview.seasonAverages.points,
    currentPropLine: pointsProp?.line ?? null,
    openPropLine: pointsProp?.openLine ?? null,
  })
  const widgets: DashboardWidget[] = [
    {
      id: "player-angle-read",
      title: "Angle read",
      subtitle: "Recommendation generated from travel, split, line, and market signals",
      statLabel: "Call",
      statValue: recommendation.headline,
      delta: `${recommendation.confidence} confidence`,
      deltaTone: recommendation.tone,
      bullets: [
        recommendation.summary,
        ...recommendation.reasons.slice(0, 2),
      ],
      trend: buildSignalTrend(recommendation.signals),
    },
    {
      id: "player-away-after-away-output",
      title: "Away-after-away production",
      subtitle: "Player output in games that followed another road game",
      statLabel: "Avg points",
      statValue: formatAverage(awayAfterAwayPoints),
      delta: `${formatSigned(
        awayAfterAwayPoints !== null && playerOverview.seasonAverages.points !== null
          ? awayAfterAwayPoints - playerOverview.seasonAverages.points
          : null
      )} vs season average`,
      deltaTone:
        awayAfterAwayPoints !== null &&
        playerOverview.seasonAverages.points !== null &&
        awayAfterAwayPoints < playerOverview.seasonAverages.points
          ? "down"
          : "neutral",
      bullets: [
        `${scope.entityName} averages ${formatAverage(awayAfterAwayRebounds)} rebounds and ${formatAverage(awayAfterAwayAssists)} assists in this spot.`,
        `${awayAfterAwayGames.length} away-after-away player games were available in the current season sample.`,
        "This is useful for fade or under routines when travel seems to clip role-player efficiency or volume.",
      ],
      trend: buildPointsTrend(recentAwayAfterAwayGames),
    },
    {
      id: "player-home-away-split",
      title: "Away vs home scoring split",
      subtitle: "A quick baseline before layering on the travel routine",
      statLabel: "Away avg",
      statValue: formatAverage(awayPoints),
      delta: `${formatSigned(
        awayPoints !== null && homePoints !== null ? awayPoints - homePoints : null
      )} vs home`,
      deltaTone:
        awayPoints !== null && homePoints !== null && awayPoints < homePoints
          ? "down"
          : "neutral",
      bullets: [
        `${scope.entityName} averages ${formatAverage(homePoints)} points at home.`,
        "If the player already has a normal away dip, repeat-road spots matter even more.",
        "If the away split is flat, look for opponent and minutes context before forcing the angle.",
      ],
      trend: buildPointsTrend(recentPoints),
    },
    {
      id: "player-travel-context",
      title: "Team travel context",
      subtitle: "The player inherits the same road sequence and rest profile as the team",
      statLabel: "Road streak",
      statValue: `${currentSpot.roadStreak}`,
      delta:
        currentSpot.nextGame && currentSpot.restDays !== null
          ? `${currentSpot.restDays} day rest before ${currentSpot.nextGame.opponentName}`
          : currentSpot.currentSpotIsAwayAfterAway
            ? "Latest completed game also came after a road game"
            : "No active away-after-away spot right now",
      deltaTone: currentSpot.currentSpotIsAwayAfterAway ? "down" : "neutral",
      bullets: [
        currentSpot.nextGame
          ? `${scope.entityTeamName} is next scheduled ${currentSpot.nextGame.isHome ? "at home" : "on the road"} vs ${currentSpot.nextGame.opponentName}.`
          : "No upcoming team game was found in the live schedule snapshot.",
        currentSpot.lastCompleted
          ? `Previous team game was ${currentSpot.lastCompleted.isHome ? "home" : "away"} vs ${currentSpot.lastCompleted.opponentName}.`
          : "No completed team schedule was available for this season sample.",
        "Travel pressure matters most when it lines up with already weak away splits or reduced minutes.",
      ],
      trend: buildPointsTrend(recentPoints),
    },
    {
      id: "player-opponent-freshness",
      title: "Opponent freshness edge",
      subtitle: "How rested the other side is relative to the player's team",
      statLabel: "Rest edge",
      statValue:
        restEdge === null
          ? "--"
          : `${restEdge > 0 ? "+" : ""}${restEdge} day${Math.abs(restEdge) === 1 ? "" : "s"}`,
      delta:
        restEdge === null
          ? "No opponent rest comparison available yet"
          : restEdge > 0
            ? "Opponent is more rested"
            : restEdge < 0
              ? `${scope.entityTeamName || scope.entityName} is more rested`
              : "Rest is even",
      deltaTone: restEdge !== null && restEdge > 0 ? "down" : "neutral",
      bullets: [
        `Opponent: ${scope.opponentName || currentSpot.nextGame?.opponentName || "Not selected yet"}.`,
        "This helps decide whether the travel angle is just noise or actually stacked with schedule pressure.",
        "Add odds later if you want the board to grade price-sensitive prop decisions too.",
      ],
      trend: buildPointsTrend(recentAwayAfterAwayGames),
    },
    {
      id: "player-market-context",
      title: "Game market context",
      subtitle: "Current spread and total for the team game behind this prop angle",
      statLabel: "Spread",
      statValue: marketOdds?.spread ?? "--",
      delta:
        marketOdds?.openSpread && marketOdds.spread
          ? `${marketOdds.openSpread} open to ${marketOdds.spread} now`
          : marketOdds?.details ?? "Live line not available yet",
      deltaTone:
        currentSpot.currentSpotIsAwayAfterAway && Boolean(marketOdds?.spread)
          ? "down"
          : "neutral",
      bullets: [
        `Moneyline: ${marketOdds?.moneyline ?? "--"} | Total: ${marketOdds?.total ?? "--"}.`,
        `Book: ${marketOdds?.provider ?? "Unavailable"}${marketOdds?.spreadOdds ? ` | Spread price ${marketOdds.spreadOdds}` : ""}.`,
        "Use this to decide whether the player angle is supported by the game market or already fully priced in.",
      ],
      trend: buildOddsTrend(marketOdds?.spread ?? null, marketOdds?.openSpread ?? null),
    },
    {
      id: "player-prop-market",
      title: `${pointsProp?.marketName ?? "Player prop"} market`,
      subtitle: "Live player prop line for the selected matchup",
      statLabel: "Current line",
      statValue: pointsProp?.line ?? "--",
      delta:
        pointsProp?.openLine && pointsProp.line
          ? `${pointsProp.openLine} open to ${pointsProp.line} now`
          : "Prop line not available yet",
      deltaTone:
        pointsProp?.line &&
        awayAfterAwayPoints !== null &&
        Number(pointsProp.line) > awayAfterAwayPoints
          ? "down"
          : "neutral",
      bullets: [
        `Over: ${pointsProp?.overOdds ?? "--"} | Under: ${pointsProp?.underOdds ?? "--"}.`,
        pointsProp?.marketName === "Points" && awayAfterAwayPoints !== null
          ? `${scope.entityName} away-after-away points average: ${formatAverage(awayAfterAwayPoints)}.`
          : `${scope.entityName} season points average: ${formatAverage(playerOverview.seasonAverages.points)}.`,
        playerPropMarkets.length > 1
          ? `Also available: ${playerPropMarkets
              .slice(1, 4)
              .map((market) => `${market.marketName} ${market.line ?? "--"}`)
              .join(" • ")}.`
          : `Book: ${pointsProp?.provider ?? "Unavailable"}.`,
      ],
      trend: buildOddsTrend(pointsProp?.line ?? null, pointsProp?.openLine ?? null),
    },
  ]

  return {
    title: dashboard.name,
    summary:
      currentSpot.currentSpotIsAwayAfterAway && currentSpot.nextGame
        ? `${scope.entityName} is entering another road game after the previous team game was also away.`
        : `${scope.entityName} is being tracked for production changes in repeat-road situations.`,
    tags: [
      "NBA",
      strategy.name,
      scope.entityName,
      scope.entityTeamName || "Player board",
    ],
    widgets,
  }
}

export async function buildDynamicDashboardView(dashboard: StoredDashboard) {
  const scope = dashboard.scope

  if (!scope || scope.strategyKey === "custom") {
    return null as DynamicDashboardView | null
  }

  if (scope.strategyKey === "away_after_away_fade") {
    if (scope.entityType === "team") {
      return buildTeamAwayAfterAwayView(dashboard, scope)
    }

    return buildPlayerAwayAfterAwayView(dashboard, scope)
  }

  return null as DynamicDashboardView | null
}
