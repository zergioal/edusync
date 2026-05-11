import type { Request, Response, NextFunction } from 'express'
import { prisma } from '@edusync/database'
import { Rol } from '@edusync/types'

export async function checkAccesoAcademico(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const auth = req.auth
  if (!auth) { next(); return }

  // Solo aplica a estudiantes y padres
  if (auth.rol !== Rol.ESTUDIANTE && auth.rol !== Rol.PADRE_TUTOR) { next(); return }

  const mesActual = new Date().getMonth() + 1

  const gestion = await prisma.gestion.findFirst({
    where: { institucion_id: auth.institucion_id, activa: true },
  })
  if (!gestion) { next(); return }

  let estudianteIds: string[] = []

  if (auth.rol === Rol.ESTUDIANTE) {
    const est = await prisma.estudiante.findFirst({
      where:  { usuario_id: auth.usuario_id },
      select: { id: true, becado: true },
    })
    if (!est || est.becado) { next(); return }
    estudianteIds = [est.id]
  } else {
    const rels = await prisma.relacionPadreHijo.findMany({
      where:   { padre_id: auth.usuario_id },
      include: { estudiante: { select: { id: true, becado: true } } },
    })
    estudianteIds = rels.filter(r => !r.estudiante.becado).map(r => r.estudiante_id)
  }

  if (estudianteIds.length === 0) { next(); return }

  const pendientes = await prisma.pension.findMany({
    where: {
      estudiante_id: { in: estudianteIds },
      gestion_id:    gestion.id,
      mes:           mesActual,
      pagado:        false,
    },
  })

  if (pendientes.length === 0) { next(); return }

  const monto_pendiente = pendientes.reduce((s, p) => s + Number(p.monto), 0)

  res.status(403).json({
    bloqueado:       true,
    mes_activo:      mesActual,
    monto_pendiente,
    mensaje:         `Tienes pensiones pendientes del mes ${mesActual}. Regulariza tu situación para acceder al sistema académico.`,
  })
}
