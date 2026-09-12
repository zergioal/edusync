import type { Request, Response, NextFunction } from 'express'
import { prisma } from '@edusync/database'
import { Rol } from '@edusync/types'

/**
 * Restringe los reportes y funcionalidades exclusivas de BTH a coordinadores
 * con el flag CoordinadorNivel.es_bth activo. No afecta a Director/Admin (ni a
 * ningún otro rol) — solo aplica a COORDINADOR.
 *
 * Un coordinador sin ninguna fila en CoordinadorNivel queda SIN restricción
 * (mismo criterio de compatibilidad que checkAlcanceCoordinador).
 */
export async function checkAccesoBTH(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (req.auth?.rol !== Rol.COORDINADOR) { next(); return }

  try {
    const alcance = await prisma.coordinadorNivel.findMany({
      where:  { usuario_id: req.auth.usuario_id },
      select: { es_bth: true },
    })
    if (alcance.length === 0) { next(); return }

    if (!alcance.some(a => a.es_bth)) {
      res.status(403).json({
        error:   'Forbidden',
        message: 'No tenés acceso a las funciones de BTH.',
      })
      return
    }
    next()
  } catch (e) {
    next(e)
  }
}
