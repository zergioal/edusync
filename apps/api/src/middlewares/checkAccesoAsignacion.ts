import type { Request, Response, NextFunction } from 'express'
import { prisma } from '@edusync/database'
import { Rol } from '@edusync/types'

// Incluye SECRETARIA porque también gestiona nota-extracurricular (canGestionarExtracurricular).
const ROLES_SUPERVISION = [Rol.ADMIN_SISTEMA, Rol.DIRECTOR, Rol.COORDINADOR, Rol.SECRETARIA]

/**
 * Guardia para toda ruta /planilla/:asignacion_id/* — antes solo se validaba el
 * ROL (requireRol), nunca que esa asignación en particular le perteneciera a
 * quien hace la request. Sin esto, cualquier DOCENTE autenticado podía pasar el
 * id de una asignación ajena y leer/importar/exportar las notas de otro curso.
 *
 * Reglas: el DOCENTE dueño de la asignación puede entrar; ADMIN_SISTEMA,
 * DIRECTOR, COORDINADOR y SECRETARIA pueden entrar a cualquier asignación de SU
 * institución (supervisión); cualquier otra combinación queda fuera.
 */
export async function checkAccesoAsignacion(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const asignacion_id = req.params['asignacion_id']
    if (!asignacion_id) { next(); return }

    const asignacion = await prisma.asignacion.findUnique({
      where:  { id: asignacion_id },
      select: { docente_id: true, docente: { select: { usuario: { select: { institucion_id: true } } } } },
    })
    if (!asignacion) {
      res.status(404).json({ error: true, code: 'NOT_FOUND', message: 'Asignación no encontrada' })
      return
    }

    const auth = req.auth!

    if (auth.rol === Rol.DOCENTE) {
      const docente = await prisma.docente.findUnique({ where: { usuario_id: auth.usuario_id }, select: { id: true } })
      if (!docente || docente.id !== asignacion.docente_id) {
        res.status(403).json({ error: true, code: 'FORBIDDEN', message: 'Esa asignación no te pertenece' })
        return
      }
    } else if (ROLES_SUPERVISION.includes(auth.rol)) {
      if (asignacion.docente.usuario.institucion_id !== auth.institucion_id) {
        // 404 en vez de 403: no revela que la asignación existe en otra institución.
        res.status(404).json({ error: true, code: 'NOT_FOUND', message: 'Asignación no encontrada' })
        return
      }
    } else {
      res.status(403).json({ error: true, code: 'FORBIDDEN', message: 'No tienes acceso a esta asignación' })
      return
    }

    next()
  } catch (e) { next(e) }
}
