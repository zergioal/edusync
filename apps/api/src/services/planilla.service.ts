import { prisma } from '@edusync/database'
import { AppError } from '../middlewares/errorHandler'

type Escala = 'ED' | 'DA' | 'DO' | 'DP'

function calcEscala(total: number): Escala {
  if (total <= 50) return 'ED'
  if (total <= 68) return 'DA'
  if (total <= 84) return 'DO'
  return 'DP'
}

export class PlanillaService {
  async get(asignacion_id: string, trimestre_id?: string) {
    // Query 1: asignacion con sus relaciones base
    const asignacion = await prisma.asignacion.findUnique({
      where: { id: asignacion_id },
      include: {
        docente: {
          include: {
            usuario: { select: { nombre: true, apellido: true, institucion_id: true } },
          },
        },
        materia:  { include: { campo: true } },
        paralelo: { include: { grado: { include: { nivel: true } } } },
        gestion:  { include: { trimestres: { orderBy: { numero: 'asc' as const } } } },
      },
    })
    if (!asignacion) throw new AppError(404, 'Asignación no encontrada', 'NOT_FOUND')

    const institucion_id = asignacion.docente.usuario.institucion_id
    const gestion_id     = asignacion.gestion.id

    // Query 2+3: dimensiones y matrículas en paralelo
    const [dimensiones, matriculas] = await Promise.all([
      prisma.dimension.findMany({
        where: { institucion_id },
        include: {
          indicadores: {
            where:   { asignacion_id, ...(trimestre_id ? { trimestre_id } : {}) },
            orderBy: { orden: 'asc' },
          },
        },
        orderBy: { orden: 'asc' },
      }),
      prisma.matricula.findMany({
        where: { paralelo_id: asignacion.paralelo_id, gestion_id },
        include: {
          estudiante: {
            include: { usuario: { select: { nombre: true, apellido: true } } },
          },
        },
        orderBy: [
          { estudiante: { usuario: { apellido: 'asc' } } },
          { estudiante: { usuario: { nombre:   'asc' } } },
        ],
      }),
    ])

    const indicadorIds  = dimensiones.flatMap(d => d.indicadores.map(i => i.id))
    const estudianteIds = matriculas.map(m => m.estudiante_id)

    // Query 4: notas (solo si hay indicadores y estudiantes)
    const notas =
      indicadorIds.length > 0 && estudianteIds.length > 0
        ? await prisma.notaIndicador.findMany({
            where: {
              indicador_id:  { in: indicadorIds },
              estudiante_id: { in: estudianteIds },
            },
          })
        : []

    // Mapa rápido estudianteId → indicadorId → puntaje
    const notasMap = new Map<string, Map<string, number | null>>()
    for (const nota of notas) {
      if (!notasMap.has(nota.estudiante_id)) notasMap.set(nota.estudiante_id, new Map())
      notasMap.get(nota.estudiante_id)!.set(nota.indicador_id, nota.puntaje ?? null)
    }

    const estudiantes = matriculas.map(m => {
      const est     = m.estudiante
      const estNotas = notasMap.get(est.id) ?? new Map<string, number | null>()

      const notasObj: Record<string, number | null>  = {}
      const promedios: Record<string, number | null> = {}
      let total  = 0
      let hasAny = false

      for (const dim of dimensiones) {
        for (const ind of dim.indicadores) notasObj[ind.id] = estNotas.get(ind.id) ?? null

        if (dim.indicadores.length === 0) { promedios[dim.id] = null; continue }

        const valores = dim.indicadores
          .map(i => estNotas.get(i.id) ?? null)
          .filter((v): v is number => v !== null)

        if (valores.length === 0) { promedios[dim.id] = null; continue }

        hasAny = true
        const avg = Math.round(valores.reduce((a, b) => a + b, 0) / valores.length)
        promedios[dim.id] = avg
        total += avg
      }

      return {
        id:       est.id,
        nombre:   est.usuario.nombre,
        apellido: est.usuario.apellido,
        codigo:   est.codigo,
        notas:    notasObj,
        promedios,
        total:    hasAny ? total : null,
        escala:   hasAny ? calcEscala(total) : null,
      }
    })

    return {
      asignacion: {
        id:      asignacion.id,
        materia: asignacion.materia,
        paralelo: asignacion.paralelo,
        gestion: asignacion.gestion,
        docente: {
          nombre:   asignacion.docente.usuario.nombre,
          apellido: asignacion.docente.usuario.apellido,
        },
      },
      dimensiones,
      estudiantes,
    }
  }
}
