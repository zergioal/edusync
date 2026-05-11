import { Router } from 'express'
import { requireRol } from '../middlewares/requireRol'
import { Rol } from '@edusync/types'
import { prisma } from '@edusync/database'

export const auditoriaRouter = Router()

const canView = requireRol(Rol.DIRECTOR, Rol.ADMIN_SISTEMA)

auditoriaRouter.get('/', canView, async (req, res, next) => {
  try {
    const { recurso, accion, page = '1', limit = '50' } = req.query as Record<string, string>
    const take = Math.min(Number(limit), 100)
    const skip = (Number(page) - 1) * take

    const data = await prisma.auditoriaLog.findMany({
      where: {
        ...(req.auth!.institucion_id ? { institucion_id: req.auth!.institucion_id } : {}),
        ...(recurso ? { recurso } : {}),
        ...(accion  ? { accion }  : {}),
      },
      orderBy: { creado_en: 'desc' },
      take,
      skip,
    })

    res.json({ data })
  } catch (e) { next(e) }
})
