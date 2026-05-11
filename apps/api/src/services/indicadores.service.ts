import { prisma } from '@edusync/database'
import { AppError } from '../middlewares/errorHandler'
import { z } from 'zod'
import { Instrumento } from '@edusync/types'

export const createIndicadorSchema = z.object({
  asignacion_id:    z.string().uuid(),
  dimension_id:     z.string().uuid(),
  trimestre_id:     z.string().uuid().optional(),
  nombre:           z.string().min(2).max(200),
  instrumento:      z.nativeEnum(Instrumento),
  fecha_aplicacion: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)'),
  es_parcial:       z.boolean().default(false),
  orden:            z.number().int().min(0).default(0),
})

export const updateIndicadorSchema = createIndicadorSchema
  .omit({ asignacion_id: true, dimension_id: true })
  .partial()

export type CreateIndicadorDto = z.infer<typeof createIndicadorSchema>
export type UpdateIndicadorDto = z.infer<typeof updateIndicadorSchema>

export class IndicadoresService {
  private async verifyOwnership(asignacion_id: string, usuario_id: string) {
    const [docente, asignacion] = await Promise.all([
      prisma.docente.findUnique({ where: { usuario_id } }),
      prisma.asignacion.findUnique({ where: { id: asignacion_id } }),
    ])
    if (!docente)     throw new AppError(403, 'Sin perfil de docente', 'FORBIDDEN')
    if (!asignacion)  throw new AppError(404, 'Asignación no encontrada', 'NOT_FOUND')
    if (asignacion.docente_id !== docente.id) {
      throw new AppError(403, 'No eres el docente de esta asignación', 'FORBIDDEN')
    }
  }

  async create(data: CreateIndicadorDto, usuario_id: string) {
    await this.verifyOwnership(data.asignacion_id, usuario_id)
    return prisma.indicador.create({
      data: {
        asignacion_id:    data.asignacion_id,
        dimension_id:     data.dimension_id,
        nombre:           data.nombre,
        instrumento:      data.instrumento,
        fecha_aplicacion: new Date(data.fecha_aplicacion),
        es_parcial:       data.es_parcial,
        orden:            data.orden,
        ...(data.trimestre_id ? { trimestre_id: data.trimestre_id } : {}),
      },
      include: { dimension: true },
    })
  }

  async update(id: string, data: UpdateIndicadorDto, usuario_id: string) {
    const indicador = await prisma.indicador.findUnique({ where: { id } })
    if (!indicador) throw new AppError(404, 'Indicador no encontrado', 'NOT_FOUND')
    await this.verifyOwnership(indicador.asignacion_id, usuario_id)

    return prisma.indicador.update({
      where: { id },
      data: {
        ...(data.nombre           ? { nombre: data.nombre }                                         : {}),
        ...(data.instrumento      ? { instrumento: data.instrumento }                               : {}),
        ...(data.fecha_aplicacion ? { fecha_aplicacion: new Date(data.fecha_aplicacion) }           : {}),
        ...(data.es_parcial !== undefined ? { es_parcial: data.es_parcial }                         : {}),
        ...(data.orden      !== undefined ? { orden: data.orden }                                   : {}),
        ...(data.trimestre_id     ? { trimestre_id: data.trimestre_id }                             : {}),
      },
      include: { dimension: true },
    })
  }

  async remove(id: string, usuario_id: string) {
    const indicador = await prisma.indicador.findUnique({
      where: { id },
      include: { _count: { select: { notas: true } } },
    })
    if (!indicador) throw new AppError(404, 'Indicador no encontrado', 'NOT_FOUND')
    await this.verifyOwnership(indicador.asignacion_id, usuario_id)

    if (indicador._count.notas > 0) {
      throw new AppError(
        409,
        `No se puede eliminar: hay ${indicador._count.notas} nota(s) registrada(s) en este indicador`,
        'HAS_NOTAS'
      )
    }
    await prisma.indicador.delete({ where: { id } })
  }
}
