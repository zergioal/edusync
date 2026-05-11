import { prisma } from '@edusync/database'
import { AppError } from '../middlewares/errorHandler'

type Escala = 'ED' | 'DA' | 'DO' | 'DP'

function calcEscala(t: number): Escala {
  if (t <= 50) return 'ED'
  if (t <= 68) return 'DA'
  if (t <= 84) return 'DO'
  return 'DP'
}

async function computePromedios(asignacion_id: string, estudiante_id: string) {
  const asignacion = await prisma.asignacion.findUnique({
    where: { id: asignacion_id },
    include: { docente: { include: { usuario: { select: { institucion_id: true } } } } },
  })
  if (!asignacion) return { promedios: {}, total: null, escala: null }

  const dimensiones = await prisma.dimension.findMany({
    where: { institucion_id: asignacion.docente.usuario.institucion_id },
    include: { indicadores: { where: { asignacion_id } } },
    orderBy: { orden: 'asc' },
  })

  const indicadorIds = dimensiones.flatMap(d => d.indicadores.map(i => i.id))
  const notas = indicadorIds.length > 0
    ? await prisma.notaIndicador.findMany({
        where: { indicador_id: { in: indicadorIds }, estudiante_id },
      })
    : []

  const notasMap = new Map(notas.map(n => [n.indicador_id, n.puntaje ?? null]))

  const promedios: Record<string, number | null> = {}
  let total  = 0
  let hasAny = false

  for (const dim of dimensiones) {
    if (dim.indicadores.length === 0) { promedios[dim.id] = null; continue }

    const valores = dim.indicadores
      .map(i => notasMap.get(i.id) ?? null)
      .filter((v): v is number => v !== null)

    if (valores.length === 0) { promedios[dim.id] = null; continue }

    hasAny = true
    const avg = Math.round(valores.reduce((a, b) => a + b, 0) / valores.length)
    promedios[dim.id] = avg
    total += avg
  }

  return {
    promedios,
    total:  hasAny ? total : null,
    escala: hasAny ? calcEscala(total) : null,
  }
}

export class NotasService {
  async upsert(data: {
    indicador_id:  string
    estudiante_id: string
    puntaje:       number | null
  }, usuario_id: string) {
    const { indicador_id, estudiante_id, puntaje } = data

    const indicador = await prisma.indicador.findUnique({
      where: { id: indicador_id },
      include: {
        dimension:  true,
        asignacion: { include: { docente: true } },
      },
    })
    if (!indicador) throw new AppError(404, 'Indicador no encontrado', 'NOT_FOUND')

    const docente = await prisma.docente.findUnique({ where: { usuario_id } })
    if (!docente || indicador.asignacion.docente_id !== docente.id) {
      throw new AppError(403, 'No tienes permiso para registrar notas aquí', 'FORBIDDEN')
    }

    if (puntaje !== null) {
      if (puntaje < 1) throw new AppError(400, 'La nota mínima es 1', 'INVALID_NOTA')
      if (puntaje > indicador.dimension.puntaje_max) {
        throw new AppError(
          400,
          `La nota máxima para ${indicador.dimension.nombre} es ${indicador.dimension.puntaje_max}`,
          'INVALID_NOTA'
        )
      }
    }

    if (puntaje === null) {
      await prisma.notaIndicador.deleteMany({ where: { indicador_id, estudiante_id } })
    } else {
      await prisma.notaIndicador.upsert({
        where:  { indicador_id_estudiante_id: { indicador_id, estudiante_id } },
        create: { indicador_id, estudiante_id, puntaje },
        update: { puntaje },
      })
    }

    return computePromedios(indicador.asignacion_id, estudiante_id)
  }
}
