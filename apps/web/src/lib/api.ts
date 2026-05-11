import { supabase } from './supabase'
import { getTenantHeaders } from '../config/tenant'

const API_BASE = (import.meta.env['VITE_API_URL'] as string | undefined) ?? '/api/v1'

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

async function getToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? null
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
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
  get:    <T>(path: string)                       => apiFetch<T>(path),
  post:   <T>(path: string, body: unknown)        => apiFetch<T>(path, { method: 'POST',   body: JSON.stringify(body) }),
  put:    <T>(path: string, body: unknown)        => apiFetch<T>(path, { method: 'PUT',    body: JSON.stringify(body) }),
  patch:  <T>(path: string, body: unknown)        => apiFetch<T>(path, { method: 'PATCH',  body: JSON.stringify(body) }),
  delete: <T>(path: string)                       => apiFetch<T>(path, { method: 'DELETE' }),
}
