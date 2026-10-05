// Mismo dominio base que usa el backend (BASE_DOMAIN) para decidir si un host es
// "edusync.com.bo" (la plataforma, sin institución) o "pioxii.edusync.com.bo" (un
// tenant). "edusync.com.bo" ya tiene 3 etiquetas (edusync/com/bo) — contarlas evita
// tratar "edusync" como si fuera un subdominio institucional inexistente.
const BASE_DOMAIN   = (import.meta.env['VITE_BASE_DOMAIN'] as string | undefined) ?? 'edusync.com.bo'
const BASE_LABELS   = BASE_DOMAIN.split('.').length
const SIN_TENANT    = new Set(['www', 'app', 'admin'])

/** Subdominio institucional actual, o '' si se está en el dominio base (la plataforma). */
export function getTenantSubdomain(): string {
  const host = window.location.hostname
  if (host === 'localhost' || host === '127.0.0.1') {
    return (import.meta.env['VITE_DEV_TENANT'] as string | undefined) ?? 'pioxii'
  }
  const parts = host.split('.')
  if (parts.length <= BASE_LABELS) return ''
  const sub = parts[0]?.toLowerCase() ?? ''
  return SIN_TENANT.has(sub) ? '' : sub
}

/** true en edusync.com.bo / www.edusync.com.bo — la página de la plataforma, sin institución. */
export function esDominioPlataforma(): boolean {
  return getTenantSubdomain() === ''
}

export function getTenantHeaders(): Record<string, string> {
  const sub = getTenantSubdomain()
  return sub ? { 'X-Tenant-Subdomain': sub } : {}
}
