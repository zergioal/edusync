import { prisma } from '@edusync/database'
import { AppError } from '../middlewares/errorHandler'

export class TrimestresesService {
  async findAll(gestion_id: string) {
    return prisma.trimestre.findMany({
      where:   { gestion_id },
      orderBy: { numero: 'asc' },
    })
  }

  async findOne(id: string) {
    const t = await prisma.trimestre.findUnique({ where: { id } })
    if (!t) throw new AppError(404, 'Trimestre no encontrado', 'NOT_FOUND')
    return t
  }

  async update(id: string, data: { fecha_inicio?: string; fecha_fin?: string }) {
    const t = await this.findOne(id)
    if (t.cerrado) throw new AppError(400, 'No se puede editar un trimestre cerrado', 'CLOSED')
    return prisma.trimestre.update({
      where: { id },
      data: {
        ...(data.fecha_inicio ? { fecha_inicio: new Date(data.fecha_inicio) } : {}),
        ...(data.fecha_fin    ? { fecha_fin:    new Date(data.fecha_fin)    } : {}),
      },
    })
  }

  /**
   * Al cerrar, si hay asignaciones sin notas en el trimestre se reportan como "observaciones" en
   * vez de simplemente rechazar el cierre — quien cierra decide si corresponde forzarlo (`forzar`)
   * pese a esas observaciones, o corregirlas primero y reintentar.
   */
  async cerrar(id: string, forzar = false) {
    const t = await this.findOne(id)
    if (t.cerrado) throw new AppError(400, 'El trimestre ya está cerrado', 'ALREADY_CLOSED')

    // Verificar que todas las asignaciones de la gestión tienen al menos 1 indicador con notas en este trimestre
    const asignaciones = await prisma.asignacion.findMany({
      where: { gestion_id: t.gestion_id },
      include: {
        indicadores: {
          where: { trimestre_id: id },
          include: { notas: true },
        },
        docente: { include: { usuario: { select: { nombre: true, apellido: true } } } },
        materia: { select: { nombre: true } },
        paralelo: { include: { grado: true } },
      },
      orderBy: [
        { paralelo: { grado: { nivel: { nombre: 'asc' } } } },
        { paralelo: { grado: { orden: 'asc' } } },
        { paralelo: { letra: 'asc' } },
        { materia: { nombre: 'asc' } },
      ],
    })

    const sinNotas = asignaciones.filter(a =>
      a.indicadores.length === 0 ||
      a.indicadores.every(i => i.notas.length === 0)
    )

    if (sinNotas.length > 0 && !forzar) {
      const observaciones = sinNotas.map(a =>
        `${a.paralelo.grado.nombre} "${a.paralelo.letra}" — ${a.materia.nombre} — Prof. ${a.docente.usuario.apellido}, ${a.docente.usuario.nombre}: sin indicadores o notas registradas en este trimestre`
      )
      return { ok: false as const, observaciones }
    }

    await prisma.trimestre.update({ where: { id }, data: { cerrado: true } })
    return { ok: true as const }
  }
}
