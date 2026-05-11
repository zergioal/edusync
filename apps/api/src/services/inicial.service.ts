import { prisma } from '@edusync/database'
import { AppError } from '../middlewares/errorHandler'

export class InicialService {
  async getObservaciones(paralelo_id: string, trimestre_id: string) {
    const trimestre = await prisma.trimestre.findUnique({ where: { id: trimestre_id } })
    if (!trimestre) throw new AppError(404, 'Trimestre no encontrado', 'NOT_FOUND')

    const matriculas = await prisma.matricula.findMany({
      where:   { paralelo_id, gestion_id: trimestre.gestion_id },
      include: {
        estudiante: {
          include: { usuario: { select: { nombre: true, apellido: true } } },
        },
      },
      orderBy: [
        { estudiante: { usuario: { apellido: 'asc' } } },
        { estudiante: { usuario: { nombre:   'asc' } } },
      ],
    })

    const observaciones = await prisma.observacionInicial.findMany({
      where: {
        trimestre_id,
        estudiante_id: { in: matriculas.map(m => m.estudiante_id) },
      },
    })

    const obsMap = new Map(observaciones.map(o => [o.estudiante_id, o]))

    return matriculas.map(m => ({
      estudiante_id: m.estudiante_id,
      estudiante: {
        nombre:   m.estudiante.usuario.nombre,
        apellido: m.estudiante.usuario.apellido,
        codigo:   m.estudiante.codigo,
      },
      observacion: obsMap.get(m.estudiante_id) ?? null,
    }))
  }

  async upsertObservaciones(
    usuario_id: string,
    entries: { estudiante_id: string; trimestre_id: string; contenido: string }[]
  ) {
    const docente = await prisma.docente.findUnique({ where: { usuario_id } })
    if (!docente) throw new AppError(404, 'Perfil de docente no encontrado', 'NOT_FOUND')

    await Promise.all(
      entries.map(e =>
        prisma.observacionInicial.upsert({
          where: {
            estudiante_id_trimestre_id: {
              estudiante_id: e.estudiante_id,
              trimestre_id:  e.trimestre_id,
            },
          },
          create: {
            docente_id:    docente.id,
            estudiante_id: e.estudiante_id,
            trimestre_id:  e.trimestre_id,
            contenido:     e.contenido,
          },
          update: { contenido: e.contenido, docente_id: docente.id },
        })
      )
    )
  }
}
