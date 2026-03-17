import {
  createWidgetSpec,
  type DashboardWidgetSpec,
  type WidgetComparison,
  type WidgetViewType,
} from "@/lib/widget-spec"

type InterpretWidgetPromptInput = {
  id: string
  prompt: string
  entityType: "team" | "player"
  strategyKey: "custom" | "away_after_away_fade"
  preferredViewType?: WidgetViewType | null
  defaultOpponentId?: string
  defaultOpponentName?: string
}

type OpenAIWidgetDraft = Partial<DashboardWidgetSpec>

function inferSampleSize(prompt: string) {
  const match = prompt.match(/last\s+(\d{1,2})/i)
  return match ? Number(match[1]) : null
}

function inferViewType(prompt: string, preferredViewType?: WidgetViewType | null): WidgetViewType {
  if (preferredViewType) {
    return preferredViewType
  }

  if (/\btable|game log|list\b/i.test(prompt)) {
    return "table"
  }

  if (/\bcompare|comparison|vs\.?|versus\b/i.test(prompt)) {
    return "comparison"
  }

  if (/\btrend|last\s+\d+|recent\b/i.test(prompt)) {
    return "trend"
  }

  return "stat"
}

function inferMetric(prompt: string, entityType: "team" | "player") {
  if (/\bpra|points\s*\+\s*rebounds\s*\+\s*assists\b/i.test(prompt)) {
    return "pra" as const
  }
  if (/\brebounds?\b/i.test(prompt)) {
    return "rebounds" as const
  }
  if (/\bassists?\b/i.test(prompt)) {
    return "assists" as const
  }
  if (/\bminutes?\b/i.test(prompt)) {
    return "minutes" as const
  }
  if (/\bmargin|point differential\b/i.test(prompt)) {
    return "margin" as const
  }
  if (/\brecord|wins?|losses?\b/i.test(prompt)) {
    return "record" as const
  }
  if (/\brest\b/i.test(prompt)) {
    return "rest_edge" as const
  }
  if (/\broad streak|road trip\b/i.test(prompt)) {
    return "road_streak" as const
  }
  if (/\bspread\b/i.test(prompt)) {
    return "spread" as const
  }
  if (/\btotal\b/i.test(prompt)) {
    return "total" as const
  }
  if (/\bmoneyline\b/i.test(prompt)) {
    return "moneyline" as const
  }
  if (/\bprop|line\b/i.test(prompt) && entityType === "player") {
    return "prop_line" as const
  }
  if (/\brecommend|angle read|fade\b/i.test(prompt)) {
    return "recommendation" as const
  }
  if (/\btoday'?s?\s*games?|scoreboard|live\s*scores?\b/i.test(prompt)) {
    return "scoreboard" as const
  }
  if (/\bstandings?|rankings?\b/i.test(prompt)) {
    return "standings" as const
  }
  if (/\binjur|out|lineup|roster\s*status\b/i.test(prompt)) {
    return "injuries" as const
  }

  return entityType === "player" ? ("points" as const) : ("team_points" as const)
}

function inferAggregation(
  prompt: string,
  viewType: WidgetViewType,
  metric: DashboardWidgetSpec["metric"]
) {
  if (metric === "record") {
    return "record" as const
  }
  if (viewType === "comparison") {
    return "compare_average" as const
  }
  if (metric === "static_text") {
    return "none" as const
  }
  if (/\bcurrent|latest|today|now\b/i.test(prompt)) {
    return "latest" as const
  }
  if (/\bcount\b/i.test(prompt)) {
    return "count" as const
  }
  if (/\btotal\b/i.test(prompt) && !/\btotal line\b/i.test(prompt)) {
    return "sum" as const
  }

  return "average" as const
}

function inferTitle(
  prompt: string,
  metric: DashboardWidgetSpec["metric"],
  viewType: WidgetViewType
) {
  const trimmed = prompt.trim()

  if (trimmed.length > 0 && trimmed.length <= 48) {
    return trimmed
  }

  const metricLabel =
    metric === "team_points"
      ? "Team points"
      : metric === "prop_line"
        ? "Prop line"
        : metric === "rest_edge"
          ? "Rest edge"
          : metric === "road_streak"
            ? "Road streak"
            : metric === "recommendation"
              ? "Angle read"
              : metric.replace(/_/g, " ")

  return `${metricLabel} ${viewType === "comparison" ? "comparison" : "widget"}`
}

function inferSummary(prompt: string, viewType: WidgetViewType) {
  const base = prompt.trim() || "Dynamic widget"

  switch (viewType) {
    case "table":
      return `Shows a table view for: ${base}.`
    case "comparison":
      return `Compares two samples for: ${base}.`
    case "trend":
      return `Tracks the recent trend for: ${base}.`
    default:
      return `Summarizes the requested stat for: ${base}.`
  }
}

function buildHeuristicSpec(input: InterpretWidgetPromptInput): DashboardWidgetSpec {
  const prompt = input.prompt.trim()
  const viewType = inferViewType(prompt, input.preferredViewType)
  const metric = inferMetric(prompt, input.entityType)
  const sampleSize = inferSampleSize(prompt)
  const subjectVenue =
    /\bhome\b/i.test(prompt) && !/\baway teams\b/i.test(prompt)
      ? "home"
      : /\baway|road\b/i.test(prompt)
        ? "away"
        : "any"
  const opponentVenue = /\bagainst away teams|vs away teams\b/i.test(prompt)
    ? "away"
    : /\bagainst home teams|vs home teams\b/i.test(prompt)
      ? "home"
      : "any"
  const travelSpot = /\baway[-\s]+after[-\s]+away|repeat road|road after road\b/i.test(prompt)
    ? "away_after_away"
    : input.strategyKey === "away_after_away_fade" && metric === "recommendation"
      ? "away_after_away"
      : "any"

  const comparison: WidgetComparison | null =
    viewType === "comparison" || /\bcompare|versus|vs\.?\b/i.test(prompt)
      ? {
          label: /\ball road\b/i.test(prompt)
            ? "All road games"
            : /\bhome\b/i.test(prompt)
              ? "Home games"
              : "Season sample",
          aggregation: "average" as const,
          filters: {
            seasonMode: "selected" as const,
            sampleMode: "all" as const,
            sampleSize: null,
            subjectVenue: /\ball road\b/i.test(prompt) ? "away" : "any",
            opponentVenue: "any" as const,
            opponentId: "",
            opponentName: "",
            travelSpot: "any" as const,
            completedOnly: true,
          },
        }
      : null

  return createWidgetSpec({
    id: input.id,
    prompt,
    title: inferTitle(prompt, metric, viewType),
    summary: inferSummary(prompt, viewType),
    entityType: input.entityType,
    viewType,
    metric,
    aggregation: inferAggregation(prompt, viewType, metric),
    filters: {
      seasonMode: "selected",
      sampleMode: sampleSize ? "last_n" : "all",
      sampleSize,
      subjectVenue,
      opponentVenue,
      opponentId:
        /\bopponent\b/i.test(prompt) && input.defaultOpponentId ? input.defaultOpponentId : "",
      opponentName:
        /\bopponent\b/i.test(prompt) && input.defaultOpponentName
          ? input.defaultOpponentName
          : "",
      travelSpot,
      completedOnly: true,
    },
    comparison,
    presentation: {
      statLabel:
        metric === "record"
          ? "Record"
          : metric === "recommendation"
            ? "Call"
            : metric === "prop_line"
              ? "Line"
              : "Value",
      precision: metric === "record" || metric === "road_streak" ? 0 : 1,
      chartType: viewType === "trend" ? "line" : "bar",
      tableLimit: 8,
    },
  })
}

async function interpretWithOpenAI(
  input: InterpretWidgetPromptInput
): Promise<DashboardWidgetSpec | null> {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    return null
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "widget_spec",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              title: { type: "string" },
              summary: { type: "string" },
              viewType: {
                type: "string",
                enum: ["stat", "trend", "table", "comparison"],
              },
              metric: {
                type: "string",
                enum: [
                  "points",
                  "rebounds",
                  "assists",
                  "minutes",
                  "pra",
                  "team_points",
                  "margin",
                  "record",
                  "rest_edge",
                  "road_streak",
                  "spread",
                  "total",
                  "moneyline",
                  "prop_line",
                  "recommendation",
                ],
              },
              aggregation: {
                type: "string",
                enum: ["average", "sum", "latest", "record", "count", "compare_average"],
              },
              filters: {
                type: "object",
                additionalProperties: false,
                properties: {
                  sampleMode: { type: "string", enum: ["all", "last_n"] },
                  sampleSize: { type: ["number", "null"] },
                  subjectVenue: { type: "string", enum: ["any", "home", "away"] },
                  opponentVenue: { type: "string", enum: ["any", "home", "away"] },
                  opponentId: { type: "string" },
                  opponentName: { type: "string" },
                  travelSpot: { type: "string", enum: ["any", "away_after_away"] },
                  completedOnly: { type: "boolean" },
                },
                required: [
                  "sampleMode",
                  "sampleSize",
                  "subjectVenue",
                  "opponentVenue",
                  "opponentId",
                  "opponentName",
                  "travelSpot",
                  "completedOnly",
                ],
              },
              comparison: {
                type: ["object", "null"],
                additionalProperties: false,
                properties: {
                  label: { type: "string" },
                  aggregation: {
                    type: "string",
                    enum: ["average", "sum", "latest", "record", "count", "compare_average"],
                  },
                  filters: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      sampleMode: { type: "string", enum: ["all", "last_n"] },
                      sampleSize: { type: ["number", "null"] },
                      subjectVenue: { type: "string", enum: ["any", "home", "away"] },
                      opponentVenue: { type: "string", enum: ["any", "home", "away"] },
                      opponentId: { type: "string" },
                      opponentName: { type: "string" },
                      travelSpot: { type: "string", enum: ["any", "away_after_away"] },
                      completedOnly: { type: "boolean" },
                    },
                    required: [
                      "sampleMode",
                      "sampleSize",
                      "subjectVenue",
                      "opponentVenue",
                      "opponentId",
                      "opponentName",
                      "travelSpot",
                      "completedOnly",
                    ],
                  },
                },
                required: ["label", "aggregation", "filters"],
              },
              presentation: {
                type: "object",
                additionalProperties: false,
                properties: {
                  statLabel: { type: "string" },
                  precision: { type: "number" },
                  chartType: { type: "string", enum: ["line", "bar"] },
                  tableLimit: { type: ["number", "null"] },
                },
                required: ["statLabel", "precision", "chartType", "tableLimit"],
              },
            },
            required: [
              "title",
              "summary",
              "viewType",
              "metric",
              "aggregation",
              "filters",
              "comparison",
              "presentation",
            ],
          },
        },
      },
      messages: [
        {
          role: "system",
          content:
            "You convert sports betting dashboard prompts into a compact widget spec. Support only NBA team/player widgets tied to one shared selector. Prefer conservative, valid outputs. If the user asks for a compare widget, set viewType to comparison and provide comparison filters.",
        },
        {
          role: "user",
          content: JSON.stringify({
            prompt: input.prompt,
            entityType: input.entityType,
            strategyKey: input.strategyKey,
            preferredViewType: input.preferredViewType ?? null,
            defaultOpponentId: input.defaultOpponentId ?? "",
            defaultOpponentName: input.defaultOpponentName ?? "",
          }),
        },
      ],
    }),
  })

  if (!response.ok) {
    return null
  }

  const data = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string
      }
    }>
  }

  const content = data.choices?.[0]?.message?.content

  if (!content) {
    return null
  }

  const parsed = JSON.parse(content) as OpenAIWidgetDraft

  return createWidgetSpec({
    id: input.id,
    prompt: input.prompt,
    entityType: input.entityType,
    ...parsed,
  })
}

export async function interpretWidgetPrompt(input: InterpretWidgetPromptInput) {
  try {
    const llmSpec = await interpretWithOpenAI(input)

    if (llmSpec) {
      return {
        spec: llmSpec,
        source: "llm" as const,
      }
    }
  } catch {
    // Fall back to the local interpreter when the API is unavailable.
  }

  return {
    spec: buildHeuristicSpec(input),
    source: "fallback" as const,
  }
}
