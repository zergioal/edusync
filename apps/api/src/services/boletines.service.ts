import { prisma } from '@edusync/database'
import { AppError } from '../middlewares/errorHandler'
import {
  calcularEscala, calcNotasEstudiante, mapDimToKeys,
  type DimInfo,
} from './calculo.service'
import type { DatosBoletin } from '../templates/boletin.template'

export class BoletinesService {
  async getBoletin(
    estudiante_id:  string,
    trimestre_id:   string,
    institucion_id: string,
  ): Promise<DatosBoletin> {
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
        usuario: { select: { nombre: true, apellido: true, institucion_id: true } },
        matriculas: {
          where:   { gestion_id },
          include: {
            paralelo: {
              include: {
                grado:  { include: { nivel: true } },
                asesor: { include: { usuario: { select: { nombre: true, apellido: true } } } },
              },
            },
          },
        },
      },
    })
    if (!estudiante) throw new AppError(404, 'Estudiante no encontrado', 'NOT_FOUND')
    if (estudiante.usuario.institucion_id !== institucion_id) {
      throw new AppError(403, 'Sin acceso', 'FORBIDDEN')
    }

    const matricula = estudiante.matriculas[0]
    if (!matricula) throw new AppError(404, 'Estudiante no matriculado en esta gestión', 'NOT_ENROLLED')

    const paralelo = matricula.paralelo
    const nivel    = paralelo.grado.nivel.nombre as string

    // ── Load data common to both paths ───────────────────────────────────────
    const [institucion, asignaciones, asistencias] = await Promise.all([
      prisma.institucion.findUnique({ where: { id: institucion_id } }),
      prisma.asignacion.findMany({
        where:   { paralelo_id: matricula.paralelo_id, gestion_id },
        include: {
          materia: {
            include: {
              campo:          true,
              parent_materia: { select: { id: true, nombre: true, campo: { select: { nombre: true } } } },
            },
          },
          docente: { include: { usuario: { select: { nombre: true, apellido: true } } } },
          indicadores: {
            where:  { trimestre_id },
            select: { id: true, dimension_id: true },
          },
        },
      }),
      prisma.asistenciaDiaria.findMany({
        where: {
          estudiante_id,
          fecha: { gte: trimestre.fecha_inicio, lte: trimestre.fecha_fin },
        },
      }),
    ])

    const base = {
      institucion: {
        nombre:    institucion?.nombre ?? '',
        logo_url:  institucion?.logo_url ?? null,
        direccion: institucion?.direccion ?? null,
      },
      estudiante: {
        nombre:         estudiante.usuario.nombre,
        apellido:       estudiante.usuario.apellido,
        codigo:         estudiante.codigo,
        paralelo:       paralelo.letra,
        grado:          paralelo.grado.nombre,
        nivel,
        docente_asesor: paralelo.asesor
          ? `${paralelo.asesor.usuario.nombre} ${paralelo.asesor.usuario.apellido}`
          : null,
      },
      gestion:   { anno: trimestre.gestion.anno },
      trimestre: {
        numero:       trimestre.numero,
        fecha_inicio: trimestre.fecha_inicio,
        fecha_fin:    trimestre.fecha_fin,
      },
      total_asistencias: asistencias.filter(a => a.estado === 'PRESENTE').length,
      total_faltas:      asistencias.filter(a => a.estado === 'AUSENTE').length,
      total_tardanzas:   asistencias.filter(a => a.estado === 'TARDANZA').length,
    }

    // ── NIVEL INICIAL: return qualitative structure ───────────────────────────
    if (nivel === 'INICIAL') {
      const obsRecs = await prisma.observacionInicial.findMany({
        where: {
          estudiante_id,
          trimestre_id,
          docente_id: { in: asignaciones.map(a => a.docente_id) },
        },
      })
      const obsMap = new Map(obsRecs.map(o => [o.docente_id, o.contenido]))

      const materias_inicial = asignaciones.map(asig => ({
        nombre:      asig.materia.nombre,
        docente:     `${asig.docente.usuario.nombre} ${asig.docente.usuario.apellido}`,
        observacion: obsMap.get(asig.docente_id) ?? null,
      }))

      return { tipo: 'INICIAL', ...base, materias_inicial }
    }

    // ── REGULAR (PRIMARIA / SECUNDARIA): numeric grades ───────────────────────
    const dimensionesRaw = await prisma.dimension.findMany({
      where:   { institucion_id },
      orderBy: { orden: 'asc' },
    })

    const dimensiones: DimInfo[] = dimensionesRaw.map(d => ({
      id:          d.id,
      nombre:      d.nombre,
      puntaje_max: d.puntaje_max,
      orden:       d.orden,
    }))

    const indicadorIds = asignaciones.flatMap(a => a.indicadores.map(i => i.id))
    const [notasRaw, obsRecs] = await Promise.all([
      indicadorIds.length > 0
        ? prisma.notaIndicador.findMany({ where: { indicador_id: { in: indicadorIds }, estudiante_id } })
        : Promise.resolve([]),
      prisma.observacionInicial.findMany({
        where: {
          estudiante_id,
          trimestre_id,
          docente_id: { in: asignaciones.map(a => a.docente_id) },
        },
      }),
    ])

    const notasMap = new Map<string, number | null>(notasRaw.map(n => [n.indicador_id, n.puntaje ?? null]))
    const obsMap   = new Map(obsRecs.map(o => [o.docente_id, o.contenido]))

    const llevaTecnica = matricula.lleva_tecnica ?? true

    // Separate regular materias from BTH sub-areas (parent materias with tiene_subareas have no asignacion)
    const regularAsigs  = asignaciones.filter(a => !a.materia.es_subarea_de_id)
    const subareaAsigs  = llevaTecnica ? asignaciones.filter(a => !!a.materia.es_subarea_de_id) : []

    const materias = regularAsigs.map(asig => {
      const { dimNotas, total, hasAny } = calcNotasEstudiante(asig.indicadores, notasMap, dimensiones)
      const dimKeys = mapDimToKeys(dimensiones, dimNotas)
      return {
        nombre:      asig.materia.nombre,
        campo:       asig.materia.campo.nombre,
        ...dimKeys,
        total:       hasAny ? total : 0,
        escala:      calcularEscala(hasAny ? total : 0),
        observacion: obsMap.get(asig.docente_id) ?? null,
      }
    })

    // Aggregate sub-area grades into one row per parent materia
    const subAreasByParent = new Map<string, typeof subareaAsigs>()
    for (const asig of subareaAsigs) {
      const pid = asig.materia.es_subarea_de_id!
      if (!subAreasByParent.has(pid)) subAreasByParent.set(pid, [])
      subAreasByParent.get(pid)!.push(asig)
    }

    for (const [, subAsigs] of subAreasByParent) {
      const parent    = subAsigs[0]!.materia.parent_materia!
      const campoNombre = subAsigs[0]!.materia.campo.nombre

      // Accumulate per-dimension sums across all sub-areas
      const dimSums:   Record<string, number> = {}
      const dimCounts: Record<string, number> = {}
      const totalesConNotas: number[] = []

      for (const asig of subAsigs) {
        const { dimNotas, total, hasAny } = calcNotasEstudiante(asig.indicadores, notasMap, dimensiones)
        if (!hasAny) continue
        totalesConNotas.push(total)
        for (const [dimId, val] of Object.entries(dimNotas)) {
          if (val !== null) {
            dimSums[dimId]   = (dimSums[dimId]   ?? 0) + val
            dimCounts[dimId] = (dimCounts[dimId] ?? 0) + 1
          }
        }
      }

      const avgDimNotas: Record<string, number | null> = {}
      for (const dim of dimensiones) {
        avgDimNotas[dim.id] = dimCounts[dim.id]
          ? Math.round((dimSums[dim.id] ?? 0) / dimCounts[dim.id])
          : null
      }

      const tteTotal = totalesConNotas.length > 0
        ? Math.round(totalesConNotas.reduce((s, t) => s + t, 0) / totalesConNotas.length)
        : 0

      const dimKeys = mapDimToKeys(dimensiones, avgDimNotas)
      materias.push({
        nombre:      parent.nombre,
        campo:       campoNombre,
        ...dimKeys,
        total:       tteTotal,
        escala:      calcularEscala(tteTotal),
        observacion: null,
      })
    }

    const promedio_general = materias.length > 0
      ? Math.round(materias.reduce((s, m) => s + m.total, 0) / materias.length)
      : 0

    return {
      tipo: 'REGULAR',
      ...base,
      dimensiones: dimensionesRaw.map((d, i) => ({
        nombre:      d.nombre,
        puntaje_max: d.puntaje_max,
        key:         ['ser', 'saber', 'hacer', 'autoevaluacion'][i] ?? `dim${i}`,
      })),
      materias,
      promedio_general,
      escala_general: calcularEscala(promedio_general),
    }
  }
}
