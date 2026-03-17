import type { ResolvedWidgetResult } from "@/lib/dashboard-widgets"

const TTL_MS = 90 * 1000 // 90 seconds
const MAX_ENTRIES = 100

type Entry = {
  results: ResolvedWidgetResult[]
  expiresAt: number
}

const cache = new Map<string, Entry>()

function prune() {
  const now = Date.now()
  for (const [key, entry] of cache.entries()) {
    if (entry.expiresAt < now || cache.size > MAX_ENTRIES) {
      cache.delete(key)
    }
  }
}

export function getCachedResolve(key: string): ResolvedWidgetResult[] | null {
  const entry = cache.get(key)
  if (!entry || entry.expiresAt < Date.now()) {
    return null
  }
  return entry.results
}

export function setCachedResolve(key: string, results: ResolvedWidgetResult[]): void {
  if (cache.size >= MAX_ENTRIES) {
    prune()
  }
  cache.set(key, {
    results,
    expiresAt: Date.now() + TTL_MS,
  })
}

export function resolveCacheKey(scope: object, widgetSpecs: object[]): string {
  return JSON.stringify({ scope, widgetSpecs })
}
