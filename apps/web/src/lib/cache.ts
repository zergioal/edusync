interface CacheEntry<T> {
  data:      T
  expiresAt: number
}

export function getCached<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(`edusync:${key}`)
    if (!raw) return null
    const entry = JSON.parse(raw) as CacheEntry<T>
    if (Date.now() > entry.expiresAt) {
      localStorage.removeItem(`edusync:${key}`)
      return null
    }
    return entry.data
  } catch {
    return null
  }
}

export function setCached<T>(key: string, data: T, ttlMinutes = 60): void {
  try {
    const entry: CacheEntry<T> = { data, expiresAt: Date.now() + ttlMinutes * 60_000 }
    localStorage.setItem(`edusync:${key}`, JSON.stringify(entry))
  } catch {
    // localStorage puede estar lleno o deshabilitado — ignorar silenciosamente
  }
}

export function invalidateCache(key: string): void {
  try {
    localStorage.removeItem(`edusync:${key}`)
  } catch {
    // ignorar
  }
}

export function invalidateCacheByPrefix(prefix: string): void {
  try {
    const full = `edusync:${prefix}`
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith(full)) localStorage.removeItem(k)
    }
  } catch {
    // ignorar
  }
}
