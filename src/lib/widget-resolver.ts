import { getDashboardStrategyDefinition } from "@/lib/dashboard-definitions"
import type { DashboardScope } from "@/lib/dashboard-builder"
import type {
  ResolvedDashboardWidget,
  ResolvedWidgetResult,
  TrendPoint,
} from "@/lib/dashboard-widgets"
import {
  getNbaGameOdds,
  getNbaPlayerOverview,
  getNbaPlayerPropMarkets,
  getNbaScoreboard,
  getNbaStandings,
  getNbaTeamInjuries,
  getNbaTeamSchedule,
} from "@/lib/sports-provider/client"
import {
  average,
  formatAverage,
  formatRecord,
  formatSigned,
  getRestDays,
  round,
} from "@/lib/sports-provider/normalize"
import type {
  GameOddsSnapshot,
  PlayerGameLog,
  PlayerOverview,
  PlayerPropMarket,
  TeamGameLog,
} from "@/lib/sports-provider/types"
import type {
  DashboardWidgetSpec,
  WidgetFilters,
  WidgetMetric,
} from "@/lib/widget-spec"

type ResolverGame = {
  id: string
  date: string
  isHome: boolean
  opponentId: string
  opponentName: string
  didWin: boolean | null
}

type ResolverContext = {
  scope: DashboardScope
  strategy: ReturnType<typeof getDashboardStrategyDefinition>
  getTeamGames: () => Promise<TeamGameLog[]>
  getPlayerOverview: () => Promise<PlayerOverview | null>
  getCurrentSpot: () => Promise<ReturnType<typeof getCurrentTravelSpot>>
  getMarketOdds: () => Promise<GameOddsSnapshot | null>
  getPlayerProps: () => Promise<PlayerPropMarket[]>
}

function createResolverContext(scope: DashboardScope): ResolverContext {
  const strategy = getDashboardStrategyDefinition(scope.strategyKey)
  const teamId = scope.entityType === "team" ? scope.entityId : scope.entityTeamId
  let teamGamesPromise: Promise<TeamGameLog[]> | null = null
  let playerOverviewPromise: Promise<PlayerOverview | null> | null = null
  let currentSpotPromise: Promise<ReturnType<typeof getCurrentTravelSpot>> | null = null
  let marketOddsPromise: Promise<GameOddsSnapshot | null> | null = null
  let playerPropsPromise: Promise<PlayerPropMarket[]> | null = null

  return {
    scope,
    strategy,
    getTeamGames: () => {
      if (!teamGamesPromise) {
        teamGamesPromise = teamId ? getNbaTeamSchedule(teamId, scope.season) : Promise.resolve([])
      }
      return teamGamesPromise
    },
    getPlayerOverview: () => {
      if (!playerOverviewPromise) {
        playerOverviewPromise =
          scope.entityType === "player"
            ? getNbaPlayerOverview(scope.entityId, {
                name: scope.entityName,
                position: scope.entitySubtitle.split("•").at(-1)?.trim() ?? "",
                teamId: scope.entityTeamId,
                teamName: scope.entityTeamName,
              })
            : Promise.resolve(null)
      }
      return playerOverviewPromise
    },
    getCurrentSpot: () => {
      if (!currentSpotPromise) {
        currentSpotPromise = (async () => getCurrentTravelSpot(await teamGamesPromiseOrLoad()))()
      }
      return currentSpotPromise
    },
    getMarketOdds: () => {
      if (!marketOddsPromise) {
        marketOddsPromise = (async () => {
          const currentSpot = await currentSpotPromiseOrLoad()
          return currentSpot.nextGame && teamId
            ? getNbaGameOdds(currentSpot.nextGame.id, teamId)
            : null
        })()
      }
      return marketOddsPromise
    },
    getPlayerProps: () => {
      if (!playerPropsPromise) {
        playerPropsPromise = (async () => {
          const currentSpot = await currentSpotPromiseOrLoad()

          return currentSpot.nextGame && scope.entityType === "player" && teamId
            ? getNbaPlayerPropMarkets(currentSpot.nextGame.id, teamId, scope.entityId)
            : []
        })()
      }
      return playerPropsPromise
    },
  }

  function teamGamesPromiseOrLoad() {
    if (!teamGamesPromise) {
      teamGamesPromise = teamId ? getNbaTeamSchedule(teamId, scope.season) : Promise.resolve([])
    }
    return teamGamesPromise
  }

  function currentSpotPromiseOrLoad() {
    if (!currentSpotPromise) {
      currentSpotPromise = (async () => getCurrentTravelSpot(await teamGamesPromiseOrLoad()))()
    }
    return currentSpotPromise
  }
}

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

function applyFilters<T extends ResolverGame>(games: T[], filters: WidgetFilters) {
  let filtered = games.filter((game) => (filters.completedOnly ? game.didWin !== null : true))

  if (filters.travelSpot === "away_after_away") {
    filtered = getAwayAfterAwayGames(filtered)
  }

  if (filters.subjectVenue === "home") {
    filtered = filtered.filter((game) => game.isHome)
  } else if (filters.subjectVenue === "away") {
    filtered = filtered.filter((game) => !game.isHome)
  }

  if (filters.opponentVenue === "away") {
    filtered = filtered.filter((game) => game.isHome)
  } else if (filters.opponentVenue === "home") {
    filtered = filtered.filter((game) => !game.isHome)
  }

  if (filters.opponentId) {
    filtered = filtered.filter((game) => game.opponentId === filters.opponentId)
  }

  if (filters.sampleMode === "last_n" && filters.sampleSize) {
    filtered = getRecentGames(filtered, filters.sampleSize)
  }

  return filtered
}

function getPlayerMetricValue(metric: WidgetMetric, game: PlayerGameLog) {
  switch (metric) {
    case "points":
      return game.points
    case "rebounds":
      return game.rebounds
    case "assists":
      return game.assists
    case "minutes":
      return game.minutes
    case "pra":
      return [game.points, game.rebounds, game.assists].every((value) => value !== null)
        ? (game.points ?? 0) + (game.rebounds ?? 0) + (game.assists ?? 0)
        : null
    default:
      return null
  }
}

function getTeamMetricValue(metric: WidgetMetric, game: TeamGameLog) {
  switch (metric) {
    case "points":
    case "team_points":
      return game.teamScore
    case "margin":
      return game.teamScore !== null && game.opponentScore !== null
        ? game.teamScore - game.opponentScore
        : null
    default:
      return null
  }
}

function formatMetricLabel(metric: WidgetMetric, entityType: DashboardScope["entityType"]) {
  switch (metric) {
    case "team_points":
      return "Team points"
    case "prop_line":
      return "Line"
    case "road_streak":
      return "Road streak"
    case "rest_edge":
      return "Rest edge"
    case "record":
      return "Record"
    case "recommendation":
      return "Call"
    case "points":
      return entityType === "player" ? "Points" : "Team points"
    default:
      return metric.replace(/_/g, " ")
  }
}

function formatMetricValue(
  value: number | null,
  metric: WidgetMetric,
  precision: number
) {
  if (value === null) {
    return "--"
  }

  if (metric === "margin") {
    return formatSigned(round(value, precision))
  }

  return `${round(value, precision)}`
}

function getDeltaTone(value: number | null, metric: WidgetMetric) {
  if (value === null) {
    return "neutral" as const
  }

  if (metric === "margin") {
    return value >= 0 ? ("up" as const) : ("down" as const)
  }

  return "neutral" as const
}

function buildTrendFromValues(values: Array<number | null>, labels: string[]) {
  return values.map((value, index) => ({
    label: labels[index] ?? `G${index + 1}`,
    value: value ?? 0,
  }))
}

function buildBullets(scope: DashboardScope, spec: DashboardWidgetSpec, sampleCount: number) {
  return [
    `${scope.entityName} | ${scope.season} season sample.`,
    sampleCount > 0
      ? `${sampleCount} games matched the widget filters.`
      : "No completed games matched the widget filters yet.",
    spec.summary,
  ]
}

async function resolveStaticWidget(spec: DashboardWidgetSpec): Promise<ResolvedDashboardWidget> {
  const legacy = spec.legacyStaticContent

  if (!legacy) {
    return {
      id: spec.id,
      title: spec.title,
      subtitle: spec.summary,
      viewType: "stat",
      statLabel: spec.presentation.statLabel,
      statValue: "--",
      delta: "No saved content",
      deltaTone: "neutral",
      bullets: [],
      trend: [],
    }
  }

  if (legacy.kind === "checklist") {
    return {
      id: spec.id,
      title: spec.title,
      subtitle: legacy.description || spec.summary,
      viewType: "table",
      statLabel: "Items",
      statValue: `${legacy.notes.length}`,
      delta: "Legacy widget",
      deltaTone: "neutral",
      bullets: legacy.notes,
      columns: ["Checklist item"],
      rows: legacy.notes.map((note) => [note]),
    }
  }

  return {
    id: spec.id,
    title: spec.title,
    subtitle: legacy.description || spec.summary,
    viewType: "stat",
    statLabel: legacy.kind === "metric" ? "Saved value" : "Saved note",
    statValue: legacy.kind === "metric" ? legacy.value || "--" : legacy.notes[0] || "--",
    delta: "Legacy widget",
    deltaTone: "neutral",
    bullets: legacy.notes,
    trend: [],
  }
}

async function resolveSnapshotWidget(
  spec: DashboardWidgetSpec,
  context: ResolverContext
): Promise<ResolvedDashboardWidget> {
  const currentSpot = await context.getCurrentSpot()
  const marketOdds = await context.getMarketOdds()
  const restEdge =
    currentSpot.nextGame || currentSpot.lastCompleted
      ? await getOpponentRestEdge(
          context.scope,
          currentSpot.nextGame?.date ?? currentSpot.lastCompleted?.date ?? null,
          currentSpot.nextGame?.opponentId ?? ""
        )
      : null

  if (spec.metric === "road_streak") {
    return {
      id: spec.id,
      title: spec.title,
      subtitle: spec.summary,
      viewType: "stat",
      statLabel: "Road streak",
      statValue: `${currentSpot.roadStreak}`,
      delta:
        currentSpot.nextGame && currentSpot.restDays !== null
          ? `${currentSpot.restDays} day rest before ${currentSpot.nextGame.opponentName}`
          : "Travel snapshot",
      deltaTone: currentSpot.currentSpotIsAwayAfterAway ? "down" : "neutral",
      bullets: [
        currentSpot.nextGame
          ? `Next game: ${currentSpot.nextGame.isHome ? "home" : "away"} vs ${currentSpot.nextGame.opponentName}.`
          : "No upcoming game found in the schedule snapshot.",
        context.scope.opponentName
          ? `Saved opponent filter: ${context.scope.opponentName}.`
          : "No fixed opponent filter was saved for this board.",
        spec.summary,
      ],
      trend: [
        { label: "Current", value: currentSpot.roadStreak },
        { label: "Live spot", value: currentSpot.currentSpotIsAwayAfterAway ? 1 : 0 },
      ],
    }
  }

  if (spec.metric === "rest_edge") {
    return {
      id: spec.id,
      title: spec.title,
      subtitle: spec.summary,
      viewType: "stat",
      statLabel: "Rest edge",
      statValue:
        restEdge === null
          ? "--"
          : `${restEdge > 0 ? "+" : ""}${restEdge} day${Math.abs(restEdge) === 1 ? "" : "s"}`,
      delta:
        restEdge === null
          ? "No opponent rest comparison available"
          : restEdge > 0
            ? "Opponent is more rested"
            : restEdge < 0
              ? `${context.scope.entityName} is more rested`
              : "Rest is even",
      deltaTone: restEdge !== null && restEdge > 0 ? "down" : "neutral",
      bullets: [
        `Opponent: ${context.scope.opponentName || currentSpot.nextGame?.opponentName || "Open opponent"}.`,
        "This uses schedule spacing only, without bookmaker context.",
        spec.summary,
      ],
      trend: [
        { label: "Edge", value: restEdge ?? 0 },
        { label: "Team rest", value: currentSpot.restDays ?? 0 },
      ],
    }
  }

  if (spec.metric === "spread" || spec.metric === "total" || spec.metric === "moneyline") {
    const value =
      spec.metric === "spread"
        ? marketOdds?.spread
        : spec.metric === "total"
          ? marketOdds?.total
          : marketOdds?.moneyline

    return {
      id: spec.id,
      title: spec.title,
      subtitle: spec.summary,
      viewType: "stat",
      statLabel: formatMetricLabel(spec.metric, context.scope.entityType),
      statValue: value ?? "--",
      delta:
        spec.metric === "spread" && marketOdds?.openSpread && marketOdds.spread
          ? `${marketOdds.openSpread} open to ${marketOdds.spread} now`
          : marketOdds?.details ?? "Live market context unavailable",
      deltaTone: "neutral",
      bullets: [
        `Book: ${marketOdds?.provider ?? "Unavailable"}.`,
        `Moneyline: ${marketOdds?.moneyline ?? "--"} | Total: ${marketOdds?.total ?? "--"}.`,
        spec.summary,
      ],
      trend: [
        { label: "Open", value: Number(marketOdds?.openSpread ?? marketOdds?.openTotal ?? 0) || 0 },
        { label: "Current", value: Number(value ?? 0) || 0 },
      ],
    }
  }

  if (spec.metric === "prop_line") {
    const markets = await context.getPlayerProps()
    const preferredMarket =
      markets.find((market) =>
        spec.prompt.toLowerCase().includes(market.marketName.toLowerCase())
      ) ?? markets[0] ?? null

    return {
      id: spec.id,
      title: spec.title,
      subtitle: spec.summary,
      viewType: "stat",
      statLabel: preferredMarket?.marketName ?? "Prop line",
      statValue: preferredMarket?.line ?? "--",
      delta:
        preferredMarket?.openLine && preferredMarket.line
          ? `${preferredMarket.openLine} open to ${preferredMarket.line} now`
          : "No live prop line found",
      deltaTone: "neutral",
      bullets: [
        `Over: ${preferredMarket?.overOdds ?? "--"} | Under: ${preferredMarket?.underOdds ?? "--"}.`,
        `Book: ${preferredMarket?.provider ?? "Unavailable"}.`,
        spec.summary,
      ],
      trend: [
        { label: "Open", value: Number(preferredMarket?.openLine ?? 0) || 0 },
        { label: "Current", value: Number(preferredMarket?.line ?? 0) || 0 },
      ],
    }
  }

  return {
    id: spec.id,
    title: spec.title,
    subtitle: spec.summary,
    viewType: "stat",
    statLabel: "Value",
    statValue: "--",
    delta: "Unsupported snapshot metric",
    deltaTone: "neutral",
    bullets: [spec.summary],
    trend: [],
  }
}

async function resolveRecommendationWidget(
  spec: DashboardWidgetSpec,
  context: ResolverContext
): Promise<ResolvedDashboardWidget> {
  const currentSpot = await context.getCurrentSpot()
  const marketOdds = await context.getMarketOdds()

  if (context.scope.entityType === "team") {
    const games = await context.getTeamGames()
    const completedGames = games.filter((game) => game.didWin !== null)
    const roadGames = completedGames.filter((game) => !game.isHome)
    const awayAfterAwayGames = getAwayAfterAwayGames(completedGames)
    const opponentRestDays = await getOpponentRestEdge(
      context.scope,
      currentSpot.nextGame?.date ?? currentSpot.lastCompleted?.date ?? null,
      currentSpot.nextGame?.opponentId ?? ""
    )
    const restEdge =
      opponentRestDays !== null && currentSpot.restDays !== null
        ? opponentRestDays - currentSpot.restDays
        : null
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
    const config = context.strategy.recommendationModel?.team

    if (!config) {
      return resolveSnapshotWidget(spec, context)
    }

    let score = 0
    const reasons: string[] = []
    const trend: TrendPoint[] = []

    if (currentSpot.currentSpotIsAwayAfterAway) {
      score += config.liveSpotWeight
      reasons.push(`${context.scope.entityName} is in a live away-after-away spot.`)
      trend.push({ label: "Travel", value: config.liveSpotWeight })
    } else {
      trend.push({ label: "Travel", value: 0 })
    }

    if (restEdge !== null && restEdge > 0) {
      score += config.opponentRestEdgeWeight
      reasons.push(`Opponent has a ${restEdge}-day rest edge.`)
      trend.push({ label: "Rest", value: config.opponentRestEdgeWeight })
    } else {
      trend.push({ label: "Rest", value: 0 })
    }

    if (averageAwayAfterAwayMargin !== null && averageAwayAfterAwayMargin < 0) {
      score += config.negativeSampleWeight
      reasons.push(
        `Historical away-after-away margin is ${formatSigned(averageAwayAfterAwayMargin)}.`
      )
      trend.push({ label: "Sample", value: config.negativeSampleWeight })
    } else {
      trend.push({ label: "Sample", value: 0 })
    }

    if (
      averageAwayAfterAwayPoints !== null &&
      averageRoadPoints !== null &&
      averageAwayAfterAwayPoints < averageRoadPoints
    ) {
      score += config.scoringDropWeight
      reasons.push("Scoring output drops below the broader road baseline in this spot.")
      trend.push({ label: "Split", value: config.scoringDropWeight })
    } else {
      trend.push({ label: "Split", value: 0 })
    }

    if (marketOdds?.spread && marketOdds?.openSpread) {
      const current = Number(marketOdds.spread)
      const open = Number(marketOdds.openSpread)

      if (Number.isFinite(current) && Number.isFinite(open) && current > open) {
        score += config.marketMoveAgainstWeight
        reasons.push("The market has moved further against the team.")
        trend.push({ label: "Market", value: config.marketMoveAgainstWeight })
      } else {
        trend.push({ label: "Market", value: 0 })
      }
    } else {
      trend.push({ label: "Market", value: 0 })
    }

    const tier =
      config.tiers.find((candidate) => score >= candidate.minScore) ?? config.fallback

    return {
      id: spec.id,
      title: spec.title,
      subtitle: spec.summary,
      viewType: "trend",
      statLabel: "Call",
      statValue: tier.headline.replace("{team}", context.scope.entityName),
      delta: `${tier.confidence} confidence`,
      deltaTone: tier.tone,
      bullets: reasons.length > 0 ? reasons : [tier.summary],
      trend,
    }
  }

  const playerOverview = await context.getPlayerOverview()
  const currentSpotForPlayer = await context.getCurrentSpot()
  const playerProps = await context.getPlayerProps()
  const pointsProp = playerProps.find((market) => market.marketName === "Points") ?? playerProps[0]
  const opponentRestDays = await getOpponentRestEdge(
    context.scope,
    currentSpotForPlayer.nextGame?.date ?? currentSpotForPlayer.lastCompleted?.date ?? null,
    currentSpotForPlayer.nextGame?.opponentId ?? ""
  )
  const restEdge =
    opponentRestDays !== null && currentSpotForPlayer.restDays !== null
      ? opponentRestDays - currentSpotForPlayer.restDays
      : null
  const awayAfterAwayGames = playerOverview
    ? getAwayAfterAwayGames(playerOverview.gameLogs)
    : []
  const awayAfterAwayAverage = average(awayAfterAwayGames.map((game) => game.points))
  const seasonAverage = playerOverview?.seasonAverages.points ?? null
  const config = context.strategy.recommendationModel?.player

  if (!config) {
    return resolveSnapshotWidget(spec, context)
  }

  let score = 0
  const reasons: string[] = []
  const trend: TrendPoint[] = []

  if (currentSpotForPlayer.currentSpotIsAwayAfterAway) {
    score += config.liveSpotWeight
    reasons.push(`${context.scope.entityName} is attached to a repeat-road team spot.`)
    trend.push({ label: "Travel", value: config.liveSpotWeight })
  } else {
    trend.push({ label: "Travel", value: 0 })
  }

  if (restEdge !== null && restEdge > 0) {
    score += config.opponentRestEdgeWeight
    reasons.push(`Opponent has a ${restEdge}-day rest edge.`)
    trend.push({ label: "Rest", value: config.opponentRestEdgeWeight })
  } else {
    trend.push({ label: "Rest", value: 0 })
  }

  if (
    awayAfterAwayAverage !== null &&
    seasonAverage !== null &&
    awayAfterAwayAverage < seasonAverage
  ) {
    score += config.weakerSplitWeight
    reasons.push(
      `Away-after-away average is ${formatAverage(awayAfterAwayAverage)} vs ${formatAverage(seasonAverage)} season average.`
    )
    trend.push({ label: "Split", value: config.weakerSplitWeight })
  } else {
    trend.push({ label: "Split", value: 0 })
  }

  if (pointsProp?.line && awayAfterAwayAverage !== null) {
    const line = Number(pointsProp.line)

    if (Number.isFinite(line) && line > awayAfterAwayAverage) {
      score += config.lineAboveAverageWeight
      reasons.push("Current prop line sits above the repeat-road average.")
      trend.push({ label: "Line", value: config.lineAboveAverageWeight })
    } else {
      trend.push({ label: "Line", value: 0 })
    }
  } else {
    trend.push({ label: "Line", value: 0 })
  }

  const tier = config.tiers.find((candidate) => score >= candidate.minScore) ?? config.fallback

  return {
    id: spec.id,
    title: spec.title,
    subtitle: spec.summary,
    viewType: "trend",
    statLabel: "Call",
    statValue: tier.headline.replace("{player}", context.scope.entityName),
    delta: `${tier.confidence} confidence`,
    deltaTone: tier.tone,
    bullets: reasons.length > 0 ? reasons : [tier.summary],
    trend,
  }
}

async function resolveLeagueWidget(
  spec: DashboardWidgetSpec,
  scope: DashboardScope,
  context: ResolverContext
): Promise<ResolvedDashboardWidget> {
  if (spec.metric === "scoreboard") {
    const games = await getNbaScoreboard()
    const rows = games.map((g) => [
      g.name,
      g.status,
      g.homeScore != null ? String(g.homeScore) : "--",
      g.awayScore != null ? String(g.awayScore) : "--",
    ])
    return {
      id: spec.id,
      title: spec.title,
      subtitle: spec.summary,
      viewType: "table",
      statLabel: "Games",
      statValue: `${games.length}`,
      delta: "Today's schedule",
      deltaTone: "neutral",
      bullets: [spec.summary],
      columns: ["Matchup", "Status", "Home", "Away"],
      rows,
    }
  }

  if (spec.metric === "standings") {
    const entries = await getNbaStandings(scope.season)
    const teamEntry = entries.find(
      (e) => e.teamId === scope.entityId || (scope.entityType === "player" && e.teamId === scope.entityTeamId)
    )
    const rows = entries.slice(0, 15).map((e) => [
      String(e.rank),
      e.teamName,
      `${e.wins}-${e.losses}`,
      e.gamesBack != null ? String(e.gamesBack) : "--",
    ])
    return {
      id: spec.id,
      title: spec.title,
      subtitle: spec.summary,
      viewType: "table",
      statLabel: teamEntry ? `${scope.entityName} rank` : "League",
      statValue: teamEntry ? `#${teamEntry.rank}` : `${entries.length} teams`,
      delta: teamEntry ? `${teamEntry.wins}-${teamEntry.losses} (${((teamEntry.winPct ?? 0) * 100).toFixed(1)}%)` : "League standings",
      deltaTone: "neutral",
      bullets: [spec.summary],
      columns: ["Rank", "Team", "Record", "GB"],
      rows,
    }
  }

  if (spec.metric === "injuries") {
    const teamId = scope.entityType === "team" ? scope.entityId : scope.entityTeamId
    const injuries = teamId ? await getNbaTeamInjuries(teamId) : []
    const bullets = injuries.length > 0 ? injuries.map((i) => `${i.playerName}: ${i.status}`) : ["No injury data for this team."]

    if (injuries.length > 0) {
      return {
        id: spec.id,
        title: spec.title,
        subtitle: spec.summary,
        viewType: "table" as const,
        statLabel: "Injuries",
        statValue: `${injuries.length}`,
        delta: scope.entityName,
        deltaTone: "neutral" as const,
        bullets,
        columns: ["Player", "Status", "Details"],
        rows: injuries.map((i) => [i.playerName, i.status, i.description]),
      }
    }

    return {
      id: spec.id,
      title: spec.title,
      subtitle: spec.summary,
      viewType: "stat" as const,
      statLabel: "Injuries",
      statValue: "None",
      delta: scope.entityName,
      deltaTone: "neutral" as const,
      bullets,
      trend: [],
    }
  }

  throw new Error(`Unhandled league metric: ${spec.metric}`)
}

async function resolveSampleWidget(
  spec: DashboardWidgetSpec,
  context: ResolverContext
): Promise<ResolvedDashboardWidget> {
  if (spec.metric === "scoreboard" || spec.metric === "standings" || spec.metric === "injuries") {
    return resolveLeagueWidget(spec, context.scope, context)
  }

  if (spec.metric === "recommendation") {
    return resolveRecommendationWidget(spec, context)
  }

  if (
    spec.metric === "road_streak" ||
    spec.metric === "rest_edge" ||
    spec.metric === "spread" ||
    spec.metric === "total" ||
    spec.metric === "moneyline" ||
    spec.metric === "prop_line"
  ) {
    return resolveSnapshotWidget(spec, context)
  }

  if (spec.metric === "static_text") {
    return resolveStaticWidget(spec)
  }

  if (context.scope.entityType === "player") {
    const overview = await context.getPlayerOverview()
    const allGames = overview?.gameLogs ?? []
    const sample = applyFilters(allGames, spec.filters)
    const trendLimit =
      spec.filters.sampleMode === "last_n" && spec.filters.sampleSize
        ? spec.filters.sampleSize
        : 5
    const recentSample = getRecentGames(sample, trendLimit)

    if (spec.metric === "record") {
      const wins = sample.filter((game) => game.didWin === true).length
      const losses = sample.filter((game) => game.didWin === false).length
      return {
        id: spec.id,
        title: spec.title,
        subtitle: spec.summary,
        viewType: spec.viewType === "trend" ? "trend" : "stat",
        statLabel: "Record",
        statValue: formatRecord(wins, losses),
        delta: `${sample.length} games`,
        deltaTone: wins >= losses ? "up" : "down",
        bullets: buildBullets(context.scope, spec, sample.length),
        trend: [
          { label: "Wins", value: wins },
          { label: "Losses", value: losses },
        ],
      }
    }

    const values = sample.map((game) => getPlayerMetricValue(spec.metric, game))
    const averageValue = average(values)

    if (spec.viewType === "table") {
      return {
        id: spec.id,
        title: spec.title,
        subtitle: spec.summary,
        viewType: "table",
        statLabel: "Rows",
        statValue: `${sample.length}`,
        delta: `${formatMetricLabel(spec.metric, context.scope.entityType)} log`,
        deltaTone: "neutral",
        bullets: buildBullets(context.scope, spec, sample.length),
        columns: ["Date", "Opp", "Venue", formatMetricLabel(spec.metric, context.scope.entityType)],
        rows: recentSample.map((game) => [
          new Date(game.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          game.opponentName,
          game.isHome ? "Home" : "Away",
          formatMetricValue(
            getPlayerMetricValue(spec.metric, game),
            spec.metric,
            spec.presentation.precision
          ),
        ]),
      }
    }

    if (spec.viewType === "comparison" && spec.comparison) {
      const comparisonSample = applyFilters(allGames, spec.comparison.filters)
      const comparisonValue = average(
        comparisonSample.map((game) => getPlayerMetricValue(spec.metric, game))
      )

      return {
        id: spec.id,
        title: spec.title,
        subtitle: spec.summary,
        viewType: "comparison",
        statLabel: "Primary",
        statValue: formatMetricValue(
          averageValue,
          spec.metric,
          spec.presentation.precision
        ),
        secondaryLabel: spec.comparison.label,
        secondaryValue: formatMetricValue(
          comparisonValue,
          spec.metric,
          spec.presentation.precision
        ),
        delta:
          averageValue !== null && comparisonValue !== null
            ? `${formatSigned(round(averageValue - comparisonValue, spec.presentation.precision))} delta`
            : "Comparison unavailable",
        deltaTone:
          averageValue !== null && comparisonValue !== null && averageValue > comparisonValue
            ? "up"
            : "neutral",
        bullets: buildBullets(context.scope, spec, sample.length),
        trend: [
          { label: "Primary", value: averageValue ?? 0 },
          { label: spec.comparison.label, value: comparisonValue ?? 0 },
        ],
      }
    }

    return {
      id: spec.id,
      title: spec.title,
      subtitle: spec.summary,
      viewType: spec.viewType === "trend" ? "trend" : "stat",
      statLabel: spec.presentation.statLabel || formatMetricLabel(spec.metric, context.scope.entityType),
      statValue: formatMetricValue(
        averageValue,
        spec.metric,
        spec.presentation.precision
      ),
      delta: `${sample.length} games`,
      deltaTone: getDeltaTone(averageValue, spec.metric),
      bullets: buildBullets(context.scope, spec, sample.length),
      trend: buildTrendFromValues(
        recentSample
          .slice()
          .reverse()
          .map((game) => getPlayerMetricValue(spec.metric, game)),
        recentSample
          .slice()
          .reverse()
          .map((_, index) => `G${index + 1}`)
      ),
    }
  }

  const games = await context.getTeamGames()
  const sample = applyFilters(games, spec.filters)
  const values = sample.map((game) => getTeamMetricValue(spec.metric, game))
  const averageValue =
    spec.metric === "record"
      ? null
      : average(values)
  const trendLimit =
    spec.filters.sampleMode === "last_n" && spec.filters.sampleSize
      ? spec.filters.sampleSize
      : 5
  const recentSample = getRecentGames(sample, trendLimit)

  if (spec.viewType === "table") {
    return {
      id: spec.id,
      title: spec.title,
      subtitle: spec.summary,
      viewType: "table",
      statLabel: "Rows",
      statValue: `${sample.length}`,
      delta: `${formatMetricLabel(spec.metric, context.scope.entityType)} log`,
      deltaTone: "neutral",
      bullets: buildBullets(context.scope, spec, sample.length),
      columns: ["Date", "Opp", "Venue", formatMetricLabel(spec.metric, context.scope.entityType)],
      rows: recentSample.map((game) => [
        new Date(game.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        game.opponentName,
        game.isHome ? "Home" : "Away",
        spec.metric === "record"
          ? game.didWin === true
            ? "W"
            : game.didWin === false
              ? "L"
              : "--"
          : formatMetricValue(
              getTeamMetricValue(spec.metric, game),
              spec.metric,
              spec.presentation.precision
            ),
      ]),
    }
  }

  if (spec.viewType === "comparison" && spec.comparison) {
    const comparisonSample = applyFilters(games, spec.comparison.filters)
    const comparisonValue = average(
      comparisonSample.map((game) => getTeamMetricValue(spec.metric, game))
    )

    return {
      id: spec.id,
      title: spec.title,
      subtitle: spec.summary,
      viewType: "comparison",
      statLabel: "Primary",
      statValue: formatMetricValue(
        averageValue,
        spec.metric,
        spec.presentation.precision
      ),
      secondaryLabel: spec.comparison.label,
      secondaryValue: formatMetricValue(
        comparisonValue,
        spec.metric,
        spec.presentation.precision
      ),
      delta:
        averageValue !== null && comparisonValue !== null
          ? `${formatSigned(round(averageValue - comparisonValue, spec.presentation.precision))} delta`
          : "Comparison unavailable",
      deltaTone:
        averageValue !== null && comparisonValue !== null && averageValue > comparisonValue
          ? "up"
          : "neutral",
      bullets: buildBullets(context.scope, spec, sample.length),
      trend: [
        { label: "Primary", value: averageValue ?? 0 },
        { label: spec.comparison.label, value: comparisonValue ?? 0 },
      ],
    }
  }

  if (spec.metric === "record") {
    const wins = sample.filter((game) => game.didWin).length
    const losses = sample.filter((game) => game.didWin === false).length

    return {
      id: spec.id,
      title: spec.title,
      subtitle: spec.summary,
      viewType: spec.viewType === "trend" ? "trend" : "stat",
      statLabel: "Record",
      statValue: formatRecord(wins, losses),
      delta: `${sample.length} games`,
      deltaTone: wins >= losses ? "up" : "down",
      bullets: buildBullets(context.scope, spec, sample.length),
      trend: [
        { label: "Wins", value: wins },
        { label: "Losses", value: losses },
      ],
    }
  }

  return {
    id: spec.id,
    title: spec.title,
    subtitle: spec.summary,
    viewType: spec.viewType === "trend" ? "trend" : "stat",
    statLabel: spec.presentation.statLabel || formatMetricLabel(spec.metric, context.scope.entityType),
    statValue: formatMetricValue(
      averageValue,
      spec.metric,
      spec.presentation.precision
    ),
    delta: `${sample.length} games`,
    deltaTone: getDeltaTone(averageValue, spec.metric),
    bullets: buildBullets(context.scope, spec, sample.length),
    trend: buildTrendFromValues(
      recentSample
        .slice()
        .reverse()
        .map((game) => getTeamMetricValue(spec.metric, game)),
      recentSample
        .slice()
        .reverse()
        .map((_, index) => `G${index + 1}`)
    ),
  }
}

export async function resolveWidgetSpec(
  spec: DashboardWidgetSpec,
  scope: DashboardScope
): Promise<ResolvedDashboardWidget> {
  const context = createResolverContext(scope)
  return resolveSampleWidget(spec, context)
}

export async function resolveDashboardWidgets(
  widgetSpecs: DashboardWidgetSpec[],
  scope: DashboardScope
) {
  return Promise.all(widgetSpecs.map((widgetSpec) => resolveWidgetSpec(widgetSpec, scope)))
}

export async function resolveDashboardWidgetsRobust(
  widgetSpecs: DashboardWidgetSpec[],
  scope: DashboardScope
): Promise<ResolvedWidgetResult[]> {
  const results: ResolvedWidgetResult[] = []

  for (const spec of widgetSpecs) {
    try {
      const widget = await resolveWidgetSpec(spec, scope)
      results.push({ ok: true, widget })
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load widget"
      console.error("[widget-resolver] resolve failed", {
        widgetId: spec.id,
        title: spec.title,
        error: message,
        stack: err instanceof Error ? err.stack : undefined,
      })
      results.push({
        ok: false,
        id: spec.id,
        title: spec.title || "Untitled widget",
        error: message,
      })
    }
  }

  return results
}
