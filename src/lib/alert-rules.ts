export const LINE_MOVE_THRESHOLD = 0.5

export function parseLineMoveAlertConfig(config: unknown): { baselineLine: number | null } {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    return { baselineLine: null }
  }

  const parsed = config as Record<string, unknown>

  return {
    baselineLine: typeof parsed.baselineLine === "number" ? parsed.baselineLine : null,
  }
}

export type LineMoveEvaluation = {
  triggered: boolean
  move: number | null
}

export function evaluateLineMove(
  currentLine: number | null,
  baselineLine: number | null,
  threshold: number = LINE_MOVE_THRESHOLD
): LineMoveEvaluation {
  if (currentLine === null || baselineLine === null) {
    return { triggered: false, move: null }
  }

  const move = currentLine - baselineLine

  return {
    triggered: Math.abs(move) >= threshold,
    move,
  }
}
