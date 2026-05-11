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

export async function tenantMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // 1. Obtener subdominio: header explícito > Host
    const xTenant  = req.headers['x-tenant-subdomain'] as string | undefined
    const host      = (req.headers['host'] ?? '').split(':')[0] ?? ''
    let subdomain   = ''

    if (xTenant) {
      subdomain = xTenant.trim().toLowerCase()
    } else if (host.includes('.')) {
      subdomain = host.split('.')[0]?.toLowerCase() ?? ''
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
