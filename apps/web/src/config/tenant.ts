export function getTenantSubdomain(): string {
  const host = window.location.hostname
  if (host === 'localhost' || host === '127.0.0.1') {
    return (import.meta.env['VITE_DEV_TENANT'] as string | undefined) ?? 'pioxii'
  }
  const parts = host.split('.')
  if (parts.length >= 3) return parts[0] ?? ''
  return ''
}

export function getTenantHeaders(): Record<string, string> {
  const sub = getTenantSubdomain()
  return sub ? { 'X-Tenant-Subdomain': sub } : {}
}
