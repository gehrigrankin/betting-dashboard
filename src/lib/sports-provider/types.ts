import type { DashboardEntityType } from "@/lib/dashboard-builder"

export type SportsEntitySearchResult = {
  id: string
  entityType: DashboardEntityType
  name: string
  subtitle: string
  teamId?: string
  teamName?: string
}

export type SportsTeam = {
  id: string
  name: string
  abbreviation: string
  city: string
}

export type SportsPlayer = {
  id: string
  name: string
  teamId: string
  teamName: string
  position: string
}

export type TeamGameLog = {
  id: string
  date: string
  isHome: boolean
  opponentId: string
  opponentName: string
  teamScore: number | null
  opponentScore: number | null
  didWin: boolean | null
  status: string
}

export type PlayerGameLog = {
  id: string
  date: string
  isHome: boolean
  teamId: string
  teamName: string
  opponentId: string
  opponentName: string
  didWin: boolean | null
  minutes: number | null
  points: number | null
  rebounds: number | null
  assists: number | null
}

export type PlayerOverview = {
  player: SportsPlayer
  gameLogs: PlayerGameLog[]
  seasonAverages: {
    points: number | null
    rebounds: number | null
    assists: number | null
    minutes: number | null
  }
}

export type GameOddsSnapshot = {
  provider: string
  spread: string | null
  spreadOdds: string | null
  moneyline: string | null
  total: string | null
  totalOdds: string | null
  openSpread: string | null
  openTotal: string | null
  details: string | null
}

export type PlayerPropMarket = {
  provider: string
  marketName: string
  line: string | null
  openLine: string | null
  overOdds: string | null
  underOdds: string | null
}

export type NbaScoreboardGame = {
  id: string
  date: string
  name: string
  status: string
  homeTeamId: string
  homeTeamName: string
  homeScore: number | null
  awayTeamId: string
  awayTeamName: string
  awayScore: number | null
}

export type NbaStandingsEntry = {
  teamId: string
  teamName: string
  rank: number
  wins: number
  losses: number
  winPct: number
  gamesBack: number | null
  conference: string
  division: string
}

export type NbaInjuryEntry = {
  playerId: string
  playerName: string
  teamId: string
  teamName: string
  status: string
  description: string
}
