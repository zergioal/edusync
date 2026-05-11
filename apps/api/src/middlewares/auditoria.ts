import type { Request, Response, NextFunction } from 'express'
import { prisma, Prisma } from '@edusync/database'

export function auditoriaMiddleware(req: Request, res: Response, next: NextFunction): void {
  const method = req.method.toUpperCase()
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) { next(); return }

  const originalJson = res.json.bind(res)
  res.json = function (body) {
    if (res.statusCode < 400) {
      const accion  = method === 'DELETE' ? 'DELETE' : method === 'POST' ? 'CREATE' : 'UPDATE'
      const recurso = req.path.split('/').filter(Boolean)[0] ?? 'unknown'
      const id      = body?.data?.id ?? req.params['id'] ?? undefined

      prisma.auditoriaLog.create({
        data: {
          usuario_id:     req.auth?.usuario_id ?? null,
          institucion_id: req.auth?.institucion_id ?? null,
          accion,
          recurso,
          recurso_id: id ?? null,
          ip:         req.ip ?? null,
          detalle:    {
            method: req.method,
            path:   req.path,
            ...(method !== 'DELETE' && req.body ? { body: sanitizeBody(req.body) as Prisma.InputJsonValue } : {}),
          } as Prisma.InputJsonValue,
        },
      }).catch(() => {}) // non-blocking
    }
    return originalJson(body)
  }

  next()
}

function sanitizeBody(body: unknown): unknown {
  if (!body || typeof body !== 'object') return body
  const sensitive = ['password', 'token', 'secret', 'comprobante']
  const sanitized: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(body as Record<string, unknown>)) {
    sanitized[k] = sensitive.some(s => k.toLowerCase().includes(s)) ? '[REDACTED]' : v
  }
  return sanitized
}
