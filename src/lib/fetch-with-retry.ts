const DEFAULT_RETRIES = 2
const DEFAULT_DELAY_MS = 800

export async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  options?: { retries?: number; delayMs?: number }
): Promise<Response> {
  const retries = options?.retries ?? DEFAULT_RETRIES
  const delayMs = options?.delayMs ?? DEFAULT_DELAY_MS

  let lastError: Error | null = null

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(input, init)
      if (response.ok || attempt >= retries) {
        return response
      }
      lastError = new Error(`HTTP ${response.status}`)
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
    }
    if (attempt < retries) {
      await new Promise((r) => setTimeout(r, delayMs * (attempt + 1)))
    }
  }

  throw lastError ?? new Error("Request failed")
}
