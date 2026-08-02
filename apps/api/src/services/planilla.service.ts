import { prisma } from '@edusync/database'
import { AppError } from '../middlewares/errorHandler'
import { BoletinesService } from './boletines.service'

type Escala = 'ED' | 'DA' | 'DO' | 'DP'

function calcEscala(total: number): Escala {
  if (total <= 50) return 'ED'
  if (total <= 68) return 'DA'
  if (total <= 84) return 'DO'
  return 'DP'
}

/** Calcula notas/promedios/total/escala de un estudiante a partir de sus dimensiones+indicadores y su mapa de notas. */
function calcularFilaEstudiante(
  dimensiones: Array<{ id: string; indicadores: Array<{ id: string }> }>,
  notasDeEstudiante: Map<string, number | null>,
) {
  const notasObj: Record<string, number | null>  = {}
  const promedios: Record<string, number | null> = {}
  let total  = 0
  let hasAny = false

  for (const dim of dimensiones) {
    for (const ind of dim.indicadores) notasObj[ind.id] = notasDeEstudiante.get(ind.id) ?? null

    if (dim.indicadores.length === 0) { promedios[dim.id] = null; continue }

    const valores = dim.indicadores
      .map(i => notasDeEstudiante.get(i.id) ?? null)
      .filter((v): v is number => v !== null)

    if (valores.length === 0) { promedios[dim.id] = null; continue }

    hasAny = true
    const avg = Math.round(valores.reduce((a, b) => a + b, 0) / valores.length)
    promedios[dim.id] = avg
    total += avg
  }

  return {
    notas:    notasObj,
    promedios,
    total:    hasAny ? total : null,
    escala:   hasAny ? calcEscala(total) : null,
  }
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
      const est      = m.estudiante
      const estNotas = notasMap.get(est.id) ?? new Map<string, number | null>()
      const fila     = calcularFilaEstudiante(dimensiones, estNotas)

      return {
        id:       est.id,
        nombre:   est.usuario.nombre,
        apellido: est.usuario.apellido,
        codigo:   est.codigo,
        ...fila,
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

  // ── Vistas estudiante/padre: planilla detallada de un solo estudiante ────────

  async getMia(usuario_id: string, trimestre_id: string, institucion_id: string) {
    const estudiante = await prisma.estudiante.findFirst({ where: { usuario_id } })
    if (!estudiante) throw new AppError(404, 'Perfil de estudiante no encontrado', 'NOT_FOUND')
    return this.getParaEstudiante(estudiante.id, trimestre_id, institucion_id)
  }

  async getHijo(padre_usuario_id: string, estudiante_id: string, trimestre_id: string, institucion_id: string) {
    const rel = await prisma.relacionPadreHijo.findFirst({
      where: { padre_id: padre_usuario_id, estudiante_id },
    })
    if (!rel) throw new AppError(403, 'Sin acceso', 'FORBIDDEN')
    return this.getParaEstudiante(estudiante_id, trimestre_id, institucion_id)
  }

  private async getParaEstudiante(estudiante_id: string, trimestre_id: string, institucion_id: string) {
    const trimestre = await prisma.trimestre.findUnique({
      where:   { id: trimestre_id },
      include: { gestion: true },
    })
    if (!trimestre) throw new AppError(404, 'Trimestre no encontrado', 'NOT_FOUND')
    if (trimestre.gestion.institucion_id !== institucion_id) {
      throw new AppError(403, 'Sin acceso', 'FORBIDDEN')
    }
    const gestion_id = trimestre.gestion_id

    const estudiante = await prisma.estudiante.findUnique({
      where:   { id: estudiante_id },
      include: {
        usuario:    { select: { nombre: true, apellido: true } },
        matriculas: {
          where:   { gestion_id },
          include: { paralelo: { include: { grado: { include: { nivel: true } } } } },
        },
      },
    })
    if (!estudiante) throw new AppError(404, 'Estudiante no encontrado', 'NOT_FOUND')

    const matricula = estudiante.matriculas[0]
    if (!matricula) throw new AppError(404, 'Estudiante no matriculado en esta gestión', 'NOT_ENROLLED')

    const nivel = matricula.paralelo.grado.nivel.nombre as string

    // Nivel Inicial no usa indicadores numéricos — se mantiene la vista cualitativa del boletín
    if (nivel === 'INICIAL') {
      return new BoletinesService().getBoletin(estudiante_id, trimestre_id, institucion_id)
    }

    const llevaTecnica = matricula.lleva_tecnica ?? true
    const asignaciones = await prisma.asignacion.findMany({
      where: {
        paralelo_id: matricula.paralelo_id,
        gestion_id,
        ...(llevaTecnica ? {} : { materia: { es_subarea_de_id: null } }),
      },
      include: { materia: { include: { campo: true } } },
      orderBy: [{ materia: { campo: { nombre: 'asc' } } }, { materia: { nombre: 'asc' } }],
    })

    const obsRecs = await prisma.observacionInicial.findMany({
      where: {
        estudiante_id,
        trimestre_id,
        docente_id: { in: asignaciones.map(a => a.docente_id) },
      },
    })
    const obsMap = new Map(obsRecs.map(o => [o.docente_id, o.contenido]))

    const asignacionIds = asignaciones.map(a => a.id)

    // Dimensiones + indicadores de TODAS las materias en una sola consulta
    const dimensiones = await prisma.dimension.findMany({
      where: { institucion_id },
      include: {
        indicadores: {
          where:   { asignacion_id: { in: asignacionIds }, ...(trimestre_id ? { trimestre_id } : {}) },
          orderBy: { orden: 'asc' },
        },
      },
      orderBy: { orden: 'asc' },
    })

    // Notas de este estudiante para todos los indicadores, en una sola consulta
    const indicadorIds = dimensiones.flatMap(d => d.indicadores.map(i => i.id))
    const notas = indicadorIds.length > 0
      ? await prisma.notaIndicador.findMany({ where: { indicador_id: { in: indicadorIds }, estudiante_id } })
      : []
    const notasDeEstudiante = new Map(notas.map(n => [n.indicador_id, n.puntaje ?? null]))

    const materias = asignaciones.map(asig => {
      // Dimensiones de esta materia: mismos objetos de dimensión, filtrando a sus propios indicadores
      const dimsAsig = dimensiones.map(d => ({
        id:          d.id,
        nombre:      d.nombre,
        puntaje_max: d.puntaje_max,
        orden:       d.orden,
        indicadores: d.indicadores.filter(i => i.asignacion_id === asig.id),
      }))
      const fila = calcularFilaEstudiante(dimsAsig, notasDeEstudiante)

      return {
        asignacion_id: asig.id,
        materia:        { nombre: asig.materia.nombre, campo: asig.materia.campo.nombre },
        observacion:    obsMap.get(asig.docente_id) ?? null,
        dimensiones:    dimsAsig,
        estudiante: {
          id:       estudiante_id,
          nombre:   estudiante.usuario.nombre,
          apellido: estudiante.usuario.apellido,
          codigo:   estudiante.codigo,
          ...fila,
        },
      }
    })

    return { tipo: 'REGULAR' as const, materias }
  }
}
