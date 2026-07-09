import { supabase } from './supabase'
import { getTenantHeaders } from '../config/tenant'

const API_BASE = ((import.meta.env['VITE_API_URL'] as string | undefined) ?? '/api/v1').replace(/\/+$/, '')

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

// ─── Token cache (55 s TTL — tokens are valid 1 h) ───────────────────────────

let _tokenCache: { token: string; expiresAt: number } | null = null

supabase.auth.onAuthStateChange(() => { _tokenCache = null })

async function getToken(): Promise<string | null> {
  const now = Date.now()
  if (_tokenCache && now < _tokenCache.expiresAt) return _tokenCache.token

  const { data: { session } } = await supabase.auth.getSession()
  if (session?.access_token) {
    _tokenCache = { token: session.access_token, expiresAt: now + 55_000 }
    return session.access_token
  }
  _tokenCache = null
  return null
}

// ─── In-flight GET deduplication ─────────────────────────────────────────────
// Prevents duplicate parallel requests for the same URL (e.g. DocenteHome +
// MisMateriasPage both calling /asignaciones/mias before either resolves).

const _inflight = new Map<string, Promise<unknown>>()

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const method = (options.method ?? 'GET').toUpperCase()

  // Deduplicate only idempotent GET requests
  if (method === 'GET') {
    const key = path
    const existing = _inflight.get(key)
    if (existing) return existing as Promise<T>

    const promise = _doFetch<T>(path, options).finally(() => _inflight.delete(key))
    _inflight.set(key, promise)
    return promise
  }

  return _doFetch<T>(path, options)
}

async function _doFetch<T>(path: string, options: RequestInit): Promise<T> {
  const token = await getToken()

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...getTenantHeaders(),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  })

  if (res.status === 204) return undefined as T

  const body = await res.json() as { data?: T; message?: string; error?: string }

  if (!res.ok) {
    throw new ApiError(res.status, body.message ?? body.error ?? `Error ${res.status}`)
  }

  return body.data as T
}

/** Descarga un archivo binario autenticado y activa el diálogo de guardar */
export async function apiDownload(path: string, filename: string): Promise<void> {
  const token = await getToken()
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { ...getTenantHeaders(), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string }
    throw new ApiError(res.status, body.message ?? `Error ${res.status}`)
  }
  const blob = await res.blob()
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Helpers tipados
export const api = {
  get:    <T>(path: string)                => apiFetch<T>(path),
  post:   <T>(path: string, body: unknown) => apiFetch<T>(path, { method: 'POST',   body: JSON.stringify(body) }),
  put:    <T>(path: string, body: unknown) => apiFetch<T>(path, { method: 'PUT',    body: JSON.stringify(body) }),
  patch:  <T>(path: string, body: unknown) => apiFetch<T>(path, { method: 'PATCH',  body: JSON.stringify(body) }),
  delete: <T>(path: string)               => apiFetch<T>(path, { method: 'DELETE' }),
}
