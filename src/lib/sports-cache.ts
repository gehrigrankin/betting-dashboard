const TTL_MS = 60 * 1000 * 5 // 5 minutes
const MAX_ENTRIES = 200

type CacheEntry<T> = {
  data: T
  expiresAt: number
}

const cache = new Map<string, CacheEntry<unknown>>()

function prune() {
  const now = Date.now()
  for (const [key, entry] of cache.entries()) {
    if (entry.expiresAt < now || cache.size > MAX_ENTRIES) {
      cache.delete(key)
    }
  }
}

export async function cachedFetch<T>(url: string, fetcher: () => Promise<T>): Promise<T> {
  const entry = cache.get(url) as CacheEntry<T> | undefined
  if (entry && entry.expiresAt > Date.now()) {
    return entry.data
  }

  if (cache.size > MAX_ENTRIES) {
    prune()
  }

  const data = await fetcher()
  cache.set(url, {
    data,
    expiresAt: Date.now() + TTL_MS,
  })
  return data
}
