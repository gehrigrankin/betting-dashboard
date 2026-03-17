import { cachedFetch } from "@/lib/sports-cache"
import { toNumber } from "@/lib/sports-provider/normalize"
import type {
  GameOddsSnapshot,
  NbaInjuryEntry,
  NbaScoreboardGame,
  NbaStandingsEntry,
  PlayerGameLog,
  PlayerPropMarket,
  PlayerOverview,
  SportsEntitySearchResult,
  SportsPlayer,
  SportsTeam,
  TeamGameLog,
} from "@/lib/sports-provider/types"

const NBA_SITE_API = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba"
const NBA_WEB_API =
  "https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba"

type EspnTeamListResponse = {
  sports?: Array<{
    leagues?: Array<{
      teams?: Array<{
        team?: {
          id?: string
          displayName?: string
          abbreviation?: string
          location?: string
        }
      }>
    }>
  }>
}

type EspnRosterResponse = {
  athletes?: Array<{
    id?: string
    displayName?: string
    fullName?: string
    position?: {
      abbreviation?: string
      displayName?: string
    }
  }>
  team?: {
    id?: string
    displayName?: string
  }
}

type EspnTeamScheduleResponse = {
  events?: Array<{
    id?: string
    date?: string
    competitions?: Array<{
      date?: string
      status?: {
        type?: {
          description?: string
          completed?: boolean
        }
      }
      competitors?: Array<{
        homeAway?: "home" | "away"
        score?: string
        team?: {
          id?: string
          displayName?: string
        }
      }>
    }>
  }>
}

type EspnPlayerOverviewResponse = {
  statistics?: {
    splits?: Array<{
      displayName?: string
      stats?: string[]
    }>
  }
  gameLog?: {
    statistics?: Array<{
      displayName?: string
      names?: string[]
      events?: Array<{
        eventId?: string
        stats?: string[]
      }>
    }>
    events?: Record<
      string,
      {
        id?: string
        gameDate?: string
        homeTeamId?: string
        awayTeamId?: string
        gameResult?: "W" | "L"
        opponent?: {
          id?: string
          displayName?: string
        }
        team?: {
          id?: string
          abbreviation?: string
        }
      }
    >
  }
}

type EspnCoreOddsResponse = {
  items?: Array<{
    provider?: {
      id?: string
      name?: string
    }
    details?: string
    awayTeamOdds?: {
      team?: {
        $ref?: string
      }
      current?: {
        pointSpread?: {
          american?: string
        }
        spread?: {
          american?: string
        }
        moneyLine?: {
          american?: string
        }
      }
      open?: {
        pointSpread?: {
          american?: string
        }
      }
    }
    homeTeamOdds?: {
      team?: {
        $ref?: string
      }
      current?: {
        pointSpread?: {
          american?: string
        }
        spread?: {
          american?: string
        }
        moneyLine?: {
          american?: string
        }
      }
      open?: {
        pointSpread?: {
          american?: string
        }
      }
    }
    current?: {
      total?: {
        american?: string
      }
      over?: {
        american?: string
      }
      under?: {
        american?: string
      }
    }
    open?: {
      total?: {
        american?: string
      }
    }
    propBets?: {
      $ref?: string
    }
  }>
}

type EspnPropBetsResponse = {
  items?: Array<{
    athlete?: {
      $ref?: string
    }
    type?: {
      name?: string
    }
    current?: {
      target?: {
        displayValue?: string
      }
      over?: {
        american?: string
      }
      under?: {
        american?: string
      }
    }
    open?: {
      target?: {
        displayValue?: string
      }
      over?: {
        american?: string
      }
      under?: {
        american?: string
      }
    }
  }>
}

let teamsPromise: Promise<SportsTeam[]> | null = null
let playersPromise: Promise<SportsPlayer[]> | null = null

async function fetchJson<T>(url: string) {
  return cachedFetch(url, async () => {
    const response = await fetch(url, {
      next: {
        revalidate: 60 * 30,
      },
    })

    if (!response.ok) {
      throw new Error(`Provider request failed: ${response.status}`)
    }

    return (await response.json()) as T
  })
}

function normalizeSearch(text: string) {
  return text.trim().toLowerCase()
}

function sortByBestMatch<T extends { name: string; subtitle?: string }>(
  results: T[],
  query: string
) {
  const normalizedQuery = normalizeSearch(query)

  return [...results].sort((left, right) => {
    const leftValue = `${left.name} ${left.subtitle ?? ""}`.toLowerCase()
    const rightValue = `${right.name} ${right.subtitle ?? ""}`.toLowerCase()
    const leftStarts = leftValue.startsWith(normalizedQuery) ? 0 : 1
    const rightStarts = rightValue.startsWith(normalizedQuery) ? 0 : 1

    if (leftStarts !== rightStarts) {
      return leftStarts - rightStarts
    }

    return left.name.localeCompare(right.name)
  })
}

export async function getNbaTeams() {
  if (!teamsPromise) {
    teamsPromise = fetchJson<EspnTeamListResponse>(`${NBA_SITE_API}/teams`).then((data) => {
      const rawTeams = data.sports?.[0]?.leagues?.[0]?.teams ?? []

      return rawTeams
        .map((entry) => entry.team)
        .filter((team): team is NonNullable<typeof team> => Boolean(team?.id))
        .map((team) => ({
          id: team.id!,
          name: team.displayName ?? "Unknown team",
          abbreviation: team.abbreviation ?? "",
          city: team.location ?? "",
        }))
    })
  }

  return teamsPromise
}

async function getNbaPlayers() {
  if (!playersPromise) {
    playersPromise = (async () => {
      const teams = await getNbaTeams()
      const rosters = await Promise.all(
        teams.map(async (team) => {
          const data = await fetchJson<EspnRosterResponse>(
            `${NBA_SITE_API}/teams/${team.id}/roster`
          )

          return (data.athletes ?? [])
            .filter((athlete): athlete is NonNullable<typeof athlete> => Boolean(athlete.id))
            .map((athlete) => ({
              id: athlete.id!,
              name: athlete.displayName ?? athlete.fullName ?? "Unknown player",
              teamId: data.team?.id ?? team.id,
              teamName: data.team?.displayName ?? team.name,
              position:
                athlete.position?.abbreviation ??
                athlete.position?.displayName ??
                "",
            }))
        })
      )

      const uniquePlayers = new Map<string, SportsPlayer>()

      rosters.flat().forEach((player) => {
        uniquePlayers.set(player.id, player)
      })

      return Array.from(uniquePlayers.values())
    })()
  }

  return playersPromise
}

export async function searchNbaEntities(
  entityType: SportsEntitySearchResult["entityType"],
  query: string
) {
  const normalizedQuery = normalizeSearch(query)

  if (normalizedQuery.length < 2) {
    return [] as SportsEntitySearchResult[]
  }

  if (entityType === "team") {
    const teams = await getNbaTeams()
    const matches = teams
      .filter((team) =>
        `${team.name} ${team.abbreviation} ${team.city}`
          .toLowerCase()
          .includes(normalizedQuery)
      )
      .map((team) => ({
        id: team.id,
        entityType: "team" as const,
        name: team.name,
        subtitle: team.abbreviation,
      }))

    return sortByBestMatch(matches, query).slice(0, 8)
  }

  const players = await getNbaPlayers()
  const matches = players
    .filter((player) =>
      `${player.name} ${player.teamName} ${player.position}`
        .toLowerCase()
        .includes(normalizedQuery)
    )
    .map((player) => ({
      id: player.id,
      entityType: "player" as const,
      name: player.name,
      subtitle: [player.teamName, player.position].filter(Boolean).join(" • "),
      teamId: player.teamId,
      teamName: player.teamName,
    }))

  return sortByBestMatch(matches, query).slice(0, 8)
}

export async function getNbaTeamSchedule(teamId: string, season: number) {
  const data = await fetchJson<EspnTeamScheduleResponse>(
    `${NBA_SITE_API}/teams/${teamId}/schedule?season=${season}&seasontype=2`
  )

  return (data.events ?? [])
    .map((event) => {
      const competition = event.competitions?.[0]
      const competitors = competition?.competitors ?? []
      const home = competitors.find((competitor) => competitor.homeAway === "home")
      const away = competitors.find((competitor) => competitor.homeAway === "away")

      if (!competition || !home?.team?.id || !away?.team?.id) {
        return null
      }

      const isHome = home.team.id === teamId
      const teamCompetitor = isHome ? home : away
      const opponent = isHome ? away : home
      const opponentId = opponent.team?.id

      if (!opponentId) {
        return null
      }

      const teamScore = toNumber(teamCompetitor.score)
      const opponentScore = toNumber(opponent.score)

      return {
        id: event.id ?? `${teamId}-${competition.date}`,
        date: competition.date ?? event.date ?? new Date().toISOString(),
        isHome,
        opponentId,
        opponentName: opponent.team?.displayName ?? "Unknown opponent",
        teamScore,
        opponentScore,
        didWin:
          teamScore !== null && opponentScore !== null
            ? teamScore > opponentScore
            : null,
        status: competition.status?.type?.description ?? "Scheduled",
      } satisfies TeamGameLog
    })
    .filter((game): game is TeamGameLog => Boolean(game))
}

export async function getNbaPlayerOverview(
  playerId: string,
  fallbackPlayer: Pick<SportsPlayer, "name" | "teamId" | "teamName" | "position">
) {
  const data = await fetchJson<EspnPlayerOverviewResponse>(
    `${NBA_WEB_API}/athletes/${playerId}/overview`
  )

  const totals = data.gameLog?.statistics?.find(
    (statGroup) => statGroup.displayName?.toLowerCase() === "totals"
  )
  const statNames = totals?.names ?? []
  const statsByEventId = new Map(
    (totals?.events ?? [])
      .filter((entry) => entry.eventId)
      .map((entry) => [entry.eventId!, entry.stats ?? []])
  )

  const gameLogs = Object.values(data.gameLog?.events ?? {})
    .map((event) => {
      if (!event.id || !event.opponent?.id || !event.opponent.displayName) {
        return null
      }

      const stats = statsByEventId.get(event.id) ?? []
      const statLookup = new Map(
        statNames.map((name, index) => [name, stats[index] ?? null])
      )

      return {
        id: event.id,
        date: event.gameDate ?? new Date().toISOString(),
        isHome: event.homeTeamId === event.team?.id,
        teamId: event.team?.id ?? fallbackPlayer.teamId,
        teamName: fallbackPlayer.teamName,
        opponentId: event.opponent.id,
        opponentName: event.opponent.displayName,
        didWin:
          event.gameResult === "W" ? true : event.gameResult === "L" ? false : null,
        minutes: toNumber(statLookup.get("minutes")),
        points: toNumber(statLookup.get("points")),
        rebounds: toNumber(statLookup.get("totalRebounds")),
        assists: toNumber(statLookup.get("assists")),
      } satisfies PlayerGameLog
    })
    .filter((game): game is PlayerGameLog => Boolean(game))
    .sort((left, right) => right.date.localeCompare(left.date))

  const regularSeasonSplit = data.statistics?.splits?.find((split) =>
    split.displayName?.toLowerCase().includes("regular")
  )
  const regularSeasonStats = regularSeasonSplit?.stats ?? []

  return {
    player: {
      id: playerId,
      name: fallbackPlayer.name,
      teamId: fallbackPlayer.teamId,
      teamName: fallbackPlayer.teamName,
      position: fallbackPlayer.position,
    },
    gameLogs,
    seasonAverages: {
      minutes: toNumber(regularSeasonStats[0]),
      rebounds: toNumber(regularSeasonStats[4]),
      assists: toNumber(regularSeasonStats[5]),
      points: toNumber(regularSeasonStats[10]),
    },
  } satisfies PlayerOverview
}

function teamRefMatchesTeamId(ref: string | undefined, teamId: string) {
  return ref?.includes(`/teams/${teamId}`) ?? false
}

export async function getNbaGameOdds(eventId: string, teamId: string) {
  const data = await fetchJson<EspnCoreOddsResponse>(
    `https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba/events/${eventId}/competitions/${eventId}/odds`
  )

  const preferredItem =
    data.items?.find(
      (item) =>
        !item.provider?.name?.toLowerCase().includes("live") &&
        (teamRefMatchesTeamId(item.awayTeamOdds?.team?.$ref, teamId) ||
          teamRefMatchesTeamId(item.homeTeamOdds?.team?.$ref, teamId))
    ) ??
    data.items?.find(
      (item) =>
        teamRefMatchesTeamId(item.awayTeamOdds?.team?.$ref, teamId) ||
        teamRefMatchesTeamId(item.homeTeamOdds?.team?.$ref, teamId)
    )

  if (!preferredItem) {
    return null as GameOddsSnapshot | null
  }

  const teamOdds = teamRefMatchesTeamId(preferredItem.awayTeamOdds?.team?.$ref, teamId)
    ? preferredItem.awayTeamOdds
    : preferredItem.homeTeamOdds

  const totalLine =
    preferredItem.current?.total?.american ?? preferredItem.open?.total?.american ?? null
  const totalPrice = preferredItem.current?.over?.american ?? preferredItem.current?.under?.american ?? null

  return {
    provider: preferredItem.provider?.name ?? "Sportsbook",
    spread: teamOdds?.current?.pointSpread?.american ?? null,
    spreadOdds: teamOdds?.current?.spread?.american ?? null,
    moneyline: teamOdds?.current?.moneyLine?.american ?? null,
    total: totalLine,
    totalOdds: totalPrice,
    openSpread: teamOdds?.open?.pointSpread?.american ?? null,
    openTotal: preferredItem.open?.total?.american ?? null,
    details: preferredItem.details ?? null,
  } satisfies GameOddsSnapshot
}

function getPreferredOddsItem(data: EspnCoreOddsResponse, teamId: string) {
  return (
    data.items?.find(
      (item) =>
        !item.provider?.name?.toLowerCase().includes("live") &&
        (teamRefMatchesTeamId(item.awayTeamOdds?.team?.$ref, teamId) ||
          teamRefMatchesTeamId(item.homeTeamOdds?.team?.$ref, teamId))
    ) ??
    data.items?.find(
      (item) =>
        teamRefMatchesTeamId(item.awayTeamOdds?.team?.$ref, teamId) ||
        teamRefMatchesTeamId(item.homeTeamOdds?.team?.$ref, teamId)
    ) ??
    null
  )
}

function normalizePropMarketName(name: string) {
  switch (name) {
    case "Total Points":
      return "Points"
    case "Total Rebounds":
      return "Rebounds"
    case "Total Assists":
      return "Assists"
    case "Total Three Point Field Goals Made":
      return "Threes"
    case "Points + Rebounds + Assists":
      return "PRA"
    default:
      return name
  }
}

export async function getNbaPlayerPropMarkets(
  eventId: string,
  teamId: string,
  playerId: string
) {
  const oddsData = await fetchJson<EspnCoreOddsResponse>(
    `https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba/events/${eventId}/competitions/${eventId}/odds`
  )
  const preferredItem = getPreferredOddsItem(oddsData, teamId)
  const propBetsRef = preferredItem?.propBets?.$ref

  if (!preferredItem || !propBetsRef) {
    return [] as PlayerPropMarket[]
  }

  const propData = await fetchJson<EspnPropBetsResponse>(propBetsRef.replace("http://", "https://"))
  const groupedMarkets = new Map<string, PlayerPropMarket>()

  for (const item of propData.items ?? []) {
    const athleteRef = item.athlete?.$ref ?? ""

    if (!athleteRef.includes(`/athletes/${playerId}`)) {
      continue
    }

    const marketName = normalizePropMarketName(item.type?.name ?? "Prop")
    const line = item.current?.target?.displayValue ?? null
    const openLine = item.open?.target?.displayValue ?? null
    const key = `${marketName}:${line ?? openLine ?? "na"}`
    const existing = groupedMarkets.get(key)

    groupedMarkets.set(key, {
      provider: preferredItem.provider?.name ?? "Sportsbook",
      marketName,
      line: existing?.line ?? line,
      openLine: existing?.openLine ?? openLine,
      overOdds: existing?.overOdds ?? item.current?.over?.american ?? null,
      underOdds: existing?.underOdds ?? item.current?.under?.american ?? null,
    })
  }

  const priority = ["Points", "Rebounds", "Assists", "PRA", "Threes"]

  return Array.from(groupedMarkets.values()).sort((left, right) => {
    const leftIndex = priority.indexOf(left.marketName)
    const rightIndex = priority.indexOf(right.marketName)

    return (leftIndex === -1 ? 999 : leftIndex) - (rightIndex === -1 ? 999 : rightIndex)
  })
}

type EspnScoreboardResponse = {
  events?: Array<{
    id?: string
    date?: string
    name?: string
    competitions?: Array<{
      status?: { type?: { description?: string } }
      competitors?: Array<{
        id?: string
        homeAway?: "home" | "away"
        score?: string
        team?: {
          id?: string
          displayName?: string
          abbreviation?: string
        }
      }>
    }>
  }>
}

export async function getNbaScoreboard(date?: string): Promise<NbaScoreboardGame[]> {
  const dates = date ?? new Date().toISOString().slice(0, 10).replace(/-/g, "")
  const data = await fetchJson<EspnScoreboardResponse>(
    `${NBA_SITE_API}/scoreboard?dates=${dates}`
  )

  return (data.events ?? []).map((event) => {
    const competition = event.competitions?.[0]
    const competitors = competition?.competitors ?? []
    const home = competitors.find((c) => c.homeAway === "home")
    const away = competitors.find((c) => c.homeAway === "away")

    return {
      id: event.id ?? "",
      date: event.date ?? "",
      name: event.name ?? "",
      status: competition?.status?.type?.description ?? "Scheduled",
      homeTeamId: home?.team?.id ?? "",
      homeTeamName: home?.team?.displayName ?? "TBD",
      homeScore: home?.score != null ? toNumber(home.score) : null,
      awayTeamId: away?.team?.id ?? "",
      awayTeamName: away?.team?.displayName ?? "TBD",
      awayScore: away?.score != null ? toNumber(away.score) : null,
    }
  })
}

type EspnStandingsRefResponse = {
  items?: Array<{ $ref?: string }>
}

type EspnStandingsDetailResponse = {
  entries?: Array<{
    team?: { id?: string; displayName?: string }
    stats?: Array<{ name?: string; value?: string | number }>
    note?: { summary?: string }
  }>
}

export async function getNbaStandings(
  season: number
): Promise<NbaStandingsEntry[]> {
  try {
    const detailUrl = `https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba/seasons/${season}/types/2/standings/0`
    const detailData = await fetchJson<EspnStandingsDetailResponse>(detailUrl)
    return (detailData.entries ?? []).map((entry, index) => {
      const stats = new Map(
        (entry.stats ?? []).map((s) => [s.name ?? "", String(s.value ?? "")])
      )
      const wins = Number(stats.get("wins") ?? 0)
      const losses = Number(stats.get("losses") ?? 0)
      const winPct = wins + losses > 0 ? wins / (wins + losses) : 0
      const gamesBack = stats.get("gamesBack")
      const note = entry.note?.summary ?? ""

      return {
        teamId: entry.team?.id ?? "",
        teamName: entry.team?.displayName ?? "Unknown",
        rank: index + 1,
        wins,
        losses,
        winPct,
        gamesBack: gamesBack !== undefined && gamesBack !== "" ? Number(gamesBack) : null,
        conference: note.includes("East") ? "Eastern" : note.includes("West") ? "Western" : "",
        division: note.replace(/ (East|West)ern/, "").trim() || "",
      }
    }).filter((e) => e.teamId)
  } catch {
    return []
  }
}

type EspnTeamRosterResponse = {
  team?: { id?: string; displayName?: string }
  athletes?: Array<{
    id?: string
    displayName?: string
    fullName?: string
    team?: { id?: string; displayName?: string }
    injuries?: Array<{
      status?: string
      shortComment?: string
      longComment?: string
    }>
  }>
}

export async function getNbaTeamInjuries(
  teamId: string
): Promise<NbaInjuryEntry[]> {
  try {
    const data = await fetchJson<EspnTeamRosterResponse>(
      `${NBA_SITE_API}/teams/${teamId}?enable=roster`
    )
    const teamName = data.team?.displayName ?? ""
    const entries: NbaInjuryEntry[] = []

    for (const athlete of data.athletes ?? []) {
      const injuryList = athlete.injuries ?? []
      for (const injury of injuryList) {
        if (injury.status) {
          entries.push({
            playerId: athlete.id ?? "",
            playerName: athlete.displayName ?? athlete.fullName ?? "Unknown",
            teamId,
            teamName,
            status: injury.status,
            description: injury.shortComment ?? injury.longComment ?? "",
          })
        }
      }
    }

    return entries
  } catch {
    return []
  }
}
