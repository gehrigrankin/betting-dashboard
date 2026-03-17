import type { DashboardEntityType } from "@/lib/dashboard-builder"

export type WidgetFavorite = {
  id: string
  prompt: string
  label: string
  entityTypes: DashboardEntityType[]
  /** Optional category for grouping in the library (e.g. "Scoring", "Context"). */
  category?: string
}

export const widgetFavorites: WidgetFavorite[] = [
  // —— Player: scoring & box ——
  { id: "points-last-3", prompt: "show player points over the last 3 games", label: "Points (last 3)", entityTypes: ["player"], category: "Scoring" },
  { id: "points-last-5", prompt: "show player points over the last 5 games", label: "Points (last 5)", entityTypes: ["player"], category: "Scoring" },
  { id: "points-last-10", prompt: "show player points over the last 10 games", label: "Points (last 10)", entityTypes: ["player"], category: "Scoring" },
  { id: "points-last-7", prompt: "show player points over the last 7 games", label: "Points (last 7)", entityTypes: ["player"], category: "Scoring" },
  { id: "points-last-15", prompt: "show player points over the last 15 games", label: "Points (last 15)", entityTypes: ["player"], category: "Scoring" },
  { id: "points-last-20", prompt: "show player points over the last 20 games", label: "Points (last 20)", entityTypes: ["player"], category: "Scoring" },
  { id: "points-away", prompt: "show player points in away games this season", label: "Points away", entityTypes: ["player"], category: "Scoring" },
  { id: "points-home", prompt: "show player points in home games this season", label: "Points home", entityTypes: ["player"], category: "Scoring" },
  { id: "points-home-last-5", prompt: "show player points in the last 5 home games", label: "Points home (last 5)", entityTypes: ["player"], category: "Scoring" },
  { id: "points-away-last-5", prompt: "show player points in the last 5 away games", label: "Points away (last 5)", entityTypes: ["player"], category: "Scoring" },
  { id: "points-compare-home-away", prompt: "compare player points in home games versus away games", label: "Points home vs away", entityTypes: ["player"], category: "Scoring" },
  { id: "points-table-last-10", prompt: "table of player points in the last 10 games", label: "Points (table, last 10)", entityTypes: ["player"], category: "Scoring" },
  { id: "points-last-3-vs-opponent", prompt: "show player points in the last 3 games against the selected opponent", label: "Points last 3 vs opponent", entityTypes: ["player"], category: "Scoring" },
  { id: "rebounds-last-3", prompt: "show player rebounds over the last 3 games", label: "Rebounds (last 3)", entityTypes: ["player"], category: "Scoring" },
  { id: "rebounds-last-5", prompt: "show player rebounds over the last 5 games", label: "Rebounds (last 5)", entityTypes: ["player"], category: "Scoring" },
  { id: "rebounds-last-10", prompt: "show player rebounds over the last 10 games", label: "Rebounds (last 10)", entityTypes: ["player"], category: "Scoring" },
  { id: "rebounds-away", prompt: "table of player rebounds in recent away games", label: "Rebounds away (table)", entityTypes: ["player"], category: "Scoring" },
  { id: "rebounds-home", prompt: "show player rebounds in home games this season", label: "Rebounds home", entityTypes: ["player"], category: "Scoring" },
  { id: "rebounds-table-last-10", prompt: "table of player rebounds in the last 10 games", label: "Rebounds (table, last 10)", entityTypes: ["player"], category: "Scoring" },
  { id: "assists-last-3", prompt: "show player assists over the last 3 games", label: "Assists (last 3)", entityTypes: ["player"], category: "Scoring" },
  { id: "assists-last-5", prompt: "show player assists over the last 5 games", label: "Assists (last 5)", entityTypes: ["player"], category: "Scoring" },
  { id: "assists-last-10", prompt: "show player assists over the last 10 games", label: "Assists (last 10)", entityTypes: ["player"], category: "Scoring" },
  { id: "assists-away", prompt: "show player assists in away games this season", label: "Assists away", entityTypes: ["player"], category: "Scoring" },
  { id: "assists-table-last-10", prompt: "table of player assists in the last 10 games", label: "Assists (table, last 10)", entityTypes: ["player"], category: "Scoring" },
  { id: "minutes-last-5", prompt: "show player minutes over the last 5 games", label: "Minutes (last 5)", entityTypes: ["player"], category: "Scoring" },
  { id: "minutes-last-10", prompt: "show player minutes over the last 10 games", label: "Minutes (last 10)", entityTypes: ["player"], category: "Scoring" },
  { id: "minutes-away", prompt: "show player minutes in away games this season", label: "Minutes away", entityTypes: ["player"], category: "Scoring" },
  { id: "minutes-home", prompt: "show player minutes in home games this season", label: "Minutes home", entityTypes: ["player"], category: "Scoring" },
  { id: "pra-last-3", prompt: "show player PRA over the last 3 games", label: "PRA (last 3)", entityTypes: ["player"], category: "Scoring" },
  { id: "pra-last-5", prompt: "show player PRA over the last 5 games", label: "PRA (last 5)", entityTypes: ["player"], category: "Scoring" },
  { id: "pra-last-10", prompt: "show player PRA over the last 10 games", label: "PRA (last 10)", entityTypes: ["player"], category: "Scoring" },
  { id: "pra-last-15", prompt: "show player PRA over the last 15 games", label: "PRA (last 15)", entityTypes: ["player"], category: "Scoring" },
  { id: "pra-away", prompt: "show player PRA in away games this season", label: "PRA away", entityTypes: ["player"], category: "Scoring" },
  { id: "pra-compare", prompt: "compare player PRA in away after away spots vs season average", label: "PRA away-to-away", entityTypes: ["player"], category: "Scoring" },
  { id: "player-record", prompt: "show player win-loss record in the sample", label: "Record (W–L)", entityTypes: ["player"], category: "Scoring" },
  { id: "player-record-last-3", prompt: "show player win-loss record over the last 3 games", label: "Record last 3", entityTypes: ["player"], category: "Scoring" },
  { id: "player-record-last-5", prompt: "show player win-loss record over the last 5 games", label: "Record last 5", entityTypes: ["player"], category: "Scoring" },
  { id: "player-record-last-10", prompt: "show player win-loss record over the last 10 games", label: "Record last 10", entityTypes: ["player"], category: "Scoring" },
  { id: "player-record-away", prompt: "show player win-loss record in away games", label: "Record away", entityTypes: ["player"], category: "Scoring" },
  { id: "player-record-home", prompt: "show player win-loss record in home games", label: "Record home", entityTypes: ["player"], category: "Scoring" },
  // —— Player: market & angle ——
  { id: "prop-line", prompt: "show current player prop line", label: "Prop line", entityTypes: ["player"], category: "Market & angle" },
  { id: "recommend-fade-player", prompt: "recommend fade based on away after away signals", label: "Fade recommendation", entityTypes: ["player"], category: "Market & angle" },
  // —— Team: scoring & results ——
  { id: "team-points-last-3", prompt: "show team points over the last 3 games", label: "Team points (last 3)", entityTypes: ["team"], category: "Scoring" },
  { id: "team-points-last-5", prompt: "show team points over the last 5 games", label: "Team points (last 5)", entityTypes: ["team"], category: "Scoring" },
  { id: "team-points-last-7", prompt: "show team points over the last 7 games", label: "Team points (last 7)", entityTypes: ["team"], category: "Scoring" },
  { id: "team-points-last-10", prompt: "show team points over the last 10 games", label: "Team points (last 10)", entityTypes: ["team"], category: "Scoring" },
  { id: "team-points-last-15", prompt: "show team points over the last 15 games", label: "Team points (last 15)", entityTypes: ["team"], category: "Scoring" },
  { id: "team-points-last-20", prompt: "show team points over the last 20 games", label: "Team points (last 20)", entityTypes: ["team"], category: "Scoring" },
  { id: "team-points-home", prompt: "show team points in home games this season", label: "Team points home", entityTypes: ["team"], category: "Scoring" },
  { id: "team-points-away", prompt: "show team points in away games this season", label: "Team points away", entityTypes: ["team"], category: "Scoring" },
  { id: "team-points-trend-last-10", prompt: "show team points trend over the last 10 games", label: "Team points trend (last 10)", entityTypes: ["team"], category: "Scoring" },
  { id: "team-points-last-3-vs-opponent", prompt: "show team points in the last 3 games against the selected opponent", label: "Team points last 3 vs opponent", entityTypes: ["team"], category: "Scoring" },
  { id: "team-margin-last-3", prompt: "show team point differential over the last 3 games", label: "Margin (last 3)", entityTypes: ["team"], category: "Scoring" },
  { id: "team-margin-last-5", prompt: "show team point differential over the last 5 games", label: "Margin (last 5)", entityTypes: ["team"], category: "Scoring" },
  { id: "team-margin-last-10", prompt: "show team point differential over the last 10 games", label: "Margin (last 10)", entityTypes: ["team"], category: "Scoring" },
  { id: "team-margin-away", prompt: "show team point differential in away games this season", label: "Margin away", entityTypes: ["team"], category: "Scoring" },
  { id: "team-margin-compare", prompt: "compare team margin in away games vs home games", label: "Margin home/away", entityTypes: ["team"], category: "Scoring" },
  { id: "team-away-after-away", prompt: "show team points trend in away after away games", label: "Away-after-away trend", entityTypes: ["team"], category: "Scoring" },
  { id: "team-record", prompt: "show team win-loss record in the sample", label: "Team record", entityTypes: ["team"], category: "Scoring" },
  { id: "team-record-last-5", prompt: "show team win-loss record over the last 5 games", label: "Team record last 5", entityTypes: ["team"], category: "Scoring" },
  { id: "team-record-last-10", prompt: "show team win-loss record over the last 10 games", label: "Team record last 10", entityTypes: ["team"], category: "Scoring" },
  { id: "team-record-away", prompt: "show team win-loss record in away games", label: "Team record away", entityTypes: ["team"], category: "Scoring" },
  { id: "team-record-home", prompt: "show team win-loss record in home games", label: "Team record home", entityTypes: ["team"], category: "Scoring" },
  // —— Team: market & context ——
  { id: "team-spread", prompt: "show current spread and market context", label: "Spread & market", entityTypes: ["team"], category: "Market & context" },
  { id: "team-total", prompt: "show current total and over/under market", label: "Total (O/U)", entityTypes: ["team"], category: "Market & context" },
  { id: "team-moneyline", prompt: "show current moneyline for the next game", label: "Moneyline", entityTypes: ["team"], category: "Market & context" },
  { id: "team-road-streak", prompt: "show current road streak for the team", label: "Road streak", entityTypes: ["team"], category: "Market & context" },
  { id: "team-rest-edge", prompt: "show rest edge between the selected team and opponent for the next game", label: "Rest edge vs opponent", entityTypes: ["team"], category: "Market & context" },
  { id: "recommend-fade-team", prompt: "recommend fade based on away after away signals", label: "Fade recommendation", entityTypes: ["team"], category: "Market & context" },
  // —— Shared: league & roster ——
  { id: "scoreboard", prompt: "show today's NBA scoreboard", label: "Today's scoreboard", entityTypes: ["team", "player"], category: "League & roster" },
  { id: "standings", prompt: "show NBA standings", label: "Standings", entityTypes: ["team", "player"], category: "League & roster" },
  { id: "injuries", prompt: "show team injury report", label: "Injury report", entityTypes: ["team", "player"], category: "League & roster" },
]
