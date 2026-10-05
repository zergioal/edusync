import type { Request, Response, NextFunction } from 'express'
import { prisma } from '@edusync/database'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      tenantId?: string
    }
  }
}

const SYSTEM_SUBDOMAINS = new Set(['www', 'api', 'localhost', 'app', 'admin'])

const BASE_DOMAIN = process.env['BASE_DOMAIN'] ?? 'edusync.com.bo'
const BASE_LABELS = BASE_DOMAIN.split('.').length

/**
 * Extrae el subdominio institucional de un host, pero SOLO si ese host en
 * realidad cuelga de BASE_DOMAIN. El frontend (Vercel) y la API (Cloud Run)
 * viven en dominios distintos, así que el header Host de una request a la API
 * nunca es "algo.edusync.com.bo" — es el hostname propio de Cloud Run. Tratar
 * ese host como si fuera un subdominio (como se hacía antes) producía un
 * valor "no vacío" que nunca coincidía con ninguna institución y además
 * tapaba el fallback correcto por Origin.
 */
function subdomainDeHost(host: string): string {
  if (!host.endsWith(BASE_DOMAIN)) return ''
  const parts = host.split('.')
  if (parts.length <= BASE_LABELS) return '' // el dominio base exacto, sin subdominio
  const sub = parts[0]?.toLowerCase() ?? ''
  return SYSTEM_SUBDOMAINS.has(sub) ? '' : sub
}

export async function tenantMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // 1. Obtener subdominio: header explícito > Origin > Host (los tres solo si
    //    de verdad cuelgan de BASE_DOMAIN)
    const xTenant = req.headers['x-tenant-subdomain'] as string | undefined
    let subdomain = xTenant?.trim().toLowerCase() ?? ''

    if (!subdomain) {
      const host = (req.headers['host'] ?? '').split(':')[0] ?? ''
      subdomain = subdomainDeHost(host)
    }

    if (!subdomain) {
      const originHeader = req.headers['origin'] as string | undefined
      if (originHeader) {
        try { subdomain = subdomainDeHost(new URL(originHeader).hostname) } catch { /* URL inválida, ignorar */ }
      }
    }

    // 2. En desarrollo sin subdominio → usar la primera institución como fallback
    if (!subdomain || SYSTEM_SUBDOMAINS.has(subdomain)) {
      if (process.env['NODE_ENV'] !== 'production') {
        const def = await prisma.institucion.findFirst({ where: { activa: true } })
        if (def) { req.tenantId = def.id; return next() }
      }
      res.status(400).json({ error: true, code: 'TENANT_MISSING', message: 'Institución no identificada' })
      return
    }

    // 3. Buscar institución activa por subdominio
    const inst = await prisma.institucion.findFirst({
      where: { subdominio: subdomain, activa: true },
    })

    if (!inst) {
      res.status(404).json({ error: true, code: 'TENANT_NOT_FOUND', message: 'Institución no encontrada' })
      return
    }

    req.tenantId = inst.id
    next()
  } catch {
    next()
  }
}
