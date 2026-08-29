import type { Request, Response, NextFunction } from 'express'
import { prisma } from '@edusync/database'
import { Rol } from '@edusync/types'
import { estaVencida } from '../services/pensiones.service'

export async function checkAccesoAcademico(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const auth = req.auth
  if (!auth) { next(); return }

  // Solo aplica a estudiantes y padres
  if (auth.rol !== Rol.ESTUDIANTE && auth.rol !== Rol.PADRE_TUTOR) { next(); return }

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

  // Igual que pensiones.service.ts#miEstadoFinanciero: bloqueado si hay alguna
  // pensión vencida (venció el día 15 de su mes) sin pagar — no solo el mes en curso.
  const pendientes = await prisma.pension.findMany({
    where: { estudiante_id: { in: estudianteIds }, gestion_id: gestion.id, pagado: false },
  })
  const vencidas = pendientes.filter(p => estaVencida(p.mes, gestion.anno))

  if (vencidas.length === 0) { next(); return }

  const monto_pendiente = vencidas.reduce((s, p) => s + Number(p.monto), 0)

  res.status(403).json({
    bloqueado:       true,
    monto_pendiente,
    message:         'Hay pensiones vencidas pendientes de pago. Regulariza tu situación para acceder al sistema académico.',
  })
}
