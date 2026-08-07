export const LINE_MOVE_THRESHOLD = 0.5

export type LineMoveAlertConfig = {
  baselineLine: number | null
  lastAlertedLine: number | null
}

export function parseLineMoveAlertConfig(config: unknown): LineMoveAlertConfig {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    return { baselineLine: null, lastAlertedLine: null }
  }

  const parsed = config as Record<string, unknown>

  return {
    baselineLine: typeof parsed.baselineLine === "number" ? parsed.baselineLine : null,
    lastAlertedLine: typeof parsed.lastAlertedLine === "number" ? parsed.lastAlertedLine : null,
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

/**
 * A steam/CLV alert already firing once for a given line shouldn't fire again on every
 * subsequent check while the line sits at that same value - only once it moves further.
 */
export function isDuplicateAlert(currentLine: number | null, lastAlertedLine: number | null): boolean {
  return currentLine !== null && lastAlertedLine !== null && currentLine === lastAlertedLine
}

export type LineMoveDecision = {
  triggered: boolean
  move: number | null
  suppressed: boolean
}

export function decideLineMoveAlert(params: {
  currentLine: number | null
  baselineLine: number | null
  lastAlertedLine: number | null
  threshold?: number
}): LineMoveDecision {
  const { currentLine, baselineLine, lastAlertedLine, threshold = LINE_MOVE_THRESHOLD } = params
  const { triggered: meetsThreshold, move } = evaluateLineMove(currentLine, baselineLine, threshold)

  if (!meetsThreshold) {
    return { triggered: false, move, suppressed: false }
  }

  if (isDuplicateAlert(currentLine, lastAlertedLine)) {
    return { triggered: false, move, suppressed: true }
  }

  return { triggered: true, move, suppressed: false }
}
