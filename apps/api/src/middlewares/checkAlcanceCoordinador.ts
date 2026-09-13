import type { Request, Response, NextFunction } from 'express'
import { prisma } from '@edusync/database'
import { Rol } from '@edusync/types'

/**
 * Restringe la generación de reportes académicos al alcance de niveles de un
 * coordinador (ver CoordinadorNivel). No afecta a ningún otro rol — Director,
 * Secretaría, Contador y Admin generan reportes de cualquier nivel sin cambios.
 *
 * Un coordinador sin ninguna fila en CoordinadorNivel queda SIN restricción
 * (compatibilidad con las cuentas de coordinador que ya existían antes de esta
 * funcionalidad).
 */
export async function checkAlcanceCoordinador(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (req.auth?.rol !== Rol.COORDINADOR) { next(); return }

  const paralelo_id = req.query['paralelo_id'] as string | undefined
  if (!paralelo_id) { next(); return }

  try {
    const alcance = await prisma.coordinadorNivel.findMany({
      where:  { usuario_id: req.auth.usuario_id },
      select: { nivel_id: true },
    })
    if (alcance.length === 0) { next(); return }

    const paralelo = await prisma.paralelo.findUnique({
      where:   { id: paralelo_id },
      include: { grado: true },
    })
    if (!paralelo) { next(); return } // el controller se encarga del 404

    const nivelesPermitidos = new Set(alcance.map(a => a.nivel_id))
    if (!nivelesPermitidos.has(paralelo.grado.nivel_id)) {
      res.status(403).json({
        error:   'Forbidden',
        message: 'No tienes acceso a reportes de este nivel.',
      })
      return
    }
    next()
  } catch (e) {
    next(e)
  }
}
