const windowMs = 60 * 1000 // 1 minute
const maxRequests = 30
const store = new Map<string, { count: number; resetAt: number }>()

function cleanup() {
  const now = Date.now()
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt < now) {
      store.delete(key)
    }
  }
}

export function checkRateLimit(identifier: string): { ok: boolean; remaining: number } {
  const now = Date.now()
  if (store.size > 1000) {
    cleanup()
  }

  let entry = store.get(identifier)
  if (!entry || entry.resetAt < now) {
    entry = { count: 0, resetAt: now + windowMs }
    store.set(identifier, entry)
  }

  entry.count += 1
  const remaining = Math.max(0, maxRequests - entry.count)

  return {
    ok: entry.count <= maxRequests,
    remaining,
  }
}
