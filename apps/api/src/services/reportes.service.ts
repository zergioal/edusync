import { prisma } from '@edusync/database'
import { AppError } from '../middlewares/errorHandler'
import type { EstadoMatricula } from '@edusync/types'
import {
  calcularEscala, calcNotasEstudiante, calcularPromedioAnual, determinarResultado,
  type DimInfo,
} from './calculo.service'
import type { DatosCentralizador } from '../templates/centralizador.template'
import type { DatosCuadroHonor }   from '../templates/cuadro-honor.template'
import { getInstitucionInfo }      from '../utils/institucion.util'

async function verificarGestion(gestion_id: string, institucion_id: string) {
  const gestion = await prisma.gestion.findUnique({ where: { id: gestion_id } })
  if (!gestion) throw new AppError(404, 'Gestión no encontrada', 'NOT_FOUND')
  if (gestion.institucion_id !== institucion_id) throw new AppError(403, 'Sin acceso', 'FORBIDDEN')
  return gestion
}

// ─── Helper: carga datos base de un paralelo+trimestre ───────────────────────

async function loadParaleloData(
  paralelo_id:   string,
  trimestre_id:  string,
  institucion_id: string,
) {
  const trimestre = await prisma.trimestre.findUnique({
    where:   { id: trimestre_id },
    include: { gestion: true },
  })
  if (!trimestre) throw new AppError(404, 'Trimestre no encontrado', 'NOT_FOUND')
  if (trimestre.gestion.institucion_id !== institucion_id) throw new AppError(403, 'Sin acceso', 'FORBIDDEN')

  const gestion_id = trimestre.gestion_id

  const paralelo = await prisma.paralelo.findUnique({
    where:   { id: paralelo_id },
    include: { grado: { include: { nivel: true } } },
  })
  if (!paralelo) throw new AppError(404, 'Paralelo no encontrado', 'NOT_FOUND')

  const [dimensionesRaw, asignaciones, matriculas] = await Promise.all([
    prisma.dimension.findMany({ where: { institucion_id }, orderBy: { orden: 'asc' } }),
    prisma.asignacion.findMany({
      where:   { paralelo_id, gestion_id },
      include: {
        materia:     { include: { campo: true } },
        docente:     { include: { usuario: { select: { nombre: true, apellido: true } } } },
        indicadores: { where: { trimestre_id }, select: { id: true, dimension_id: true } },
      },
    }),
    prisma.matricula.findMany({
      where:   { paralelo_id, gestion_id },
      include: { estudiante: { include: { usuario: { select: { nombre: true, apellido: true } } } } },
      orderBy: [
        { estudiante: { usuario: { apellido: 'asc' } } },
        { estudiante: { usuario: { nombre:   'asc' } } },
      ],
    }),
  ])

  const dimensiones: DimInfo[] = dimensionesRaw.map(d => ({
    id: d.id, nombre: d.nombre, puntaje_max: d.puntaje_max, orden: d.orden,
  }))

  const indicadorIds  = asignaciones.flatMap(a => a.indicadores.map(i => i.id))
  const estudianteIds = matriculas.map(m => m.estudiante_id)

  const notas = indicadorIds.length > 0 && estudianteIds.length > 0
    ? await prisma.notaIndicador.findMany({
        where: { indicador_id: { in: indicadorIds }, estudiante_id: { in: estudianteIds } },
      })
    : []

  // notasIndex[est_id][ind_id] = puntaje
  const notasIndex = new Map<string, Map<string, number | null>>()
  for (const nota of notas) {
    if (!notasIndex.has(nota.estudiante_id)) notasIndex.set(nota.estudiante_id, new Map())
    notasIndex.get(nota.estudiante_id)!.set(nota.indicador_id, nota.puntaje ?? null)
  }

  return { trimestre, gestion_id, paralelo, dimensiones, asignaciones, matriculas, notasIndex }
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class ReportesService {

  async getCuadroHonor(
    paralelo_id:    string,
    trimestre_id:   string,
    institucion_id: string,
  ): Promise<DatosCuadroHonor> {
    const { trimestre, paralelo, dimensiones, asignaciones, matriculas, notasIndex } =
      await loadParaleloData(paralelo_id, trimestre_id, institucion_id)

    const estudiantesCalc = matriculas.map(m => {
      const est  = m.estudiante
      const mapa = notasIndex.get(est.id) ?? new Map()

      const promediosPorMateria = asignaciones.map(asig => {
        const { total, hasAny } = calcNotasEstudiante(asig.indicadores, mapa, dimensiones)
        return hasAny ? total : 0
      })
      const promedio_general = promediosPorMateria.length > 0
        ? Math.round(promediosPorMateria.reduce((a, b) => a + b, 0) / promediosPorMateria.length)
        : 0

      return {
        nombre:              est.usuario.nombre,
        apellido:            est.usuario.apellido,
        codigo:              est.codigo,
        promedios_materia:   promediosPorMateria,
        promedio_general,
        escala_general:      calcularEscala(promedio_general),
        materias_reprobadas: promediosPorMateria.filter(p => p <= 50).length,
      }
    })

    estudiantesCalc.sort((a, b) => b.promedio_general - a.promedio_general)
    const withPos = estudiantesCalc.map((e, i) => ({ posicion: i + 1, ...e }))
    const institucion = await getInstitucionInfo(institucion_id)

    return {
      institucion,
      paralelo:    paralelo.letra,
      grado:       paralelo.grado.nombre,
      nivel:       paralelo.grado.nivel.nombre,
      trimestre:   trimestre.numero,
      anno:        trimestre.gestion.anno,
      materias:    asignaciones.map(a => ({ nombre: a.materia.nombre })),
      estudiantes: withPos,
    }
  }

  async getCentralizador(
    paralelo_id:    string,
    trimestre_id:   string,
    institucion_id: string,
  ): Promise<DatosCentralizador> {
    const { trimestre, paralelo, dimensiones, asignaciones, matriculas, notasIndex } =
      await loadParaleloData(paralelo_id, trimestre_id, institucion_id)

    const materias = asignaciones.map(a => ({
      id:    a.id,
      nombre: a.materia.nombre,
      campo:  a.materia.campo.nombre,
    }))

    const estudiantesOut = matriculas.map(m => {
      const est  = m.estudiante
      const mapa = notasIndex.get(est.id) ?? new Map()
      const notas: Record<string, { total: number | null }> = {}
      let sumTotal = 0, cnt = 0

      for (const asig of asignaciones) {
        const { total, hasAny } = calcNotasEstudiante(asig.indicadores, mapa, dimensiones)
        notas[asig.id] = { total: hasAny ? total : null }
        if (hasAny) { sumTotal += total; cnt++ }
      }
      return {
        nombre:   est.usuario.nombre,
        apellido: est.usuario.apellido,
        codigo:   est.codigo,
        notas,
        promedio: cnt > 0 ? Math.round(sumTotal / cnt) : null,
      }
    })
    const institucion = await getInstitucionInfo(institucion_id)

    return {
      institucion,
      paralelo:    paralelo.letra,
      grado:       paralelo.grado.nombre,
      nivel:       paralelo.grado.nivel.nombre,
      trimestre:   trimestre.numero,
      anno:        trimestre.gestion.anno,
      materias,
      estudiantes: estudiantesOut,
    }
  }

  async getParciales(
    trimestre_id:   string,
    paralelo_id:    string,
    institucion_id: string,
  ) {
    const trimestre = await prisma.trimestre.findUnique({
      where:   { id: trimestre_id },
      include: { gestion: true },
    })
    if (!trimestre) throw new AppError(404, 'Trimestre no encontrado', 'NOT_FOUND')
    if (trimestre.gestion.institucion_id !== institucion_id) throw new AppError(403, 'Sin acceso', 'FORBIDDEN')

    const asignaciones = await prisma.asignacion.findMany({
      where: { paralelo_id, gestion_id: trimestre.gestion_id },
      include: {
        materia: { select: { nombre: true } },
        docente: { include: { usuario: { select: { nombre: true, apellido: true } } } },
        indicadores: {
          where:   { trimestre_id, es_parcial: true },
          include: { notas: { select: { estudiante_id: true } } },
        },
      },
    })

    const matriculas = await prisma.matricula.findMany({
      where: { paralelo_id, gestion_id: trimestre.gestion_id },
      select: { estudiante_id: true },
    })
    const totalEstudiantes = matriculas.length

    return asignaciones.map(asig => {
      const parciales = asig.indicadores.map(ind => ({
        indicador:              { nombre: ind.nombre, fecha_aplicacion: ind.fecha_aplicacion },
        entregado:              ind.notas.length > 0,
        estudiantes_sin_nota:   totalEstudiantes - ind.notas.length,
      }))
      return {
        docente:          { nombre: asig.docente.usuario.nombre, apellido: asig.docente.usuario.apellido },
        materia:          { nombre: asig.materia.nombre },
        parciales,
        todos_entregados: parciales.every(p => p.entregado),
      }
    })
  }

  async getCarpetasEntregables(
    trimestre_id:   string,
    paralelo_id:    string,
    institucion_id: string,
  ) {
    const trimestre = await prisma.trimestre.findUnique({
      where:   { id: trimestre_id },
      include: { gestion: true },
    })
    if (!trimestre) throw new AppError(404, 'Trimestre no encontrado', 'NOT_FOUND')
    if (trimestre.gestion.institucion_id !== institucion_id) throw new AppError(403, 'Sin acceso', 'FORBIDDEN')

    const mesActual = new Date().getMonth() + 1

    const matriculas = await prisma.matricula.findMany({
      where: { paralelo_id, gestion_id: trimestre.gestion_id },
      include: {
        estudiante: {
          include: {
            usuario:  { select: { nombre: true, apellido: true } },
            pensiones: {
              where: { gestion_id: trimestre.gestion_id, mes: mesActual, pagado: false },
              select: { id: true },
            },
          },
        },
      },
      orderBy: [
        { estudiante: { usuario: { apellido: 'asc' } } },
        { estudiante: { usuario: { nombre:   'asc' } } },
      ],
    })

    return matriculas.map((m, idx) => {
      const est          = m.estudiante
      const tienePendiente = est.pensiones.length > 0
      return {
        posicion_lista:  idx + 1,
        estudiante:      { nombre: est.usuario.nombre, apellido: est.usuario.apellido, codigo: est.codigo },
        puede_recibir:   !tienePendiente,
        motivo_bloqueo:  tienePendiente ? `Pensión pendiente del mes ${mesActual}` : null,
      }
    })
  }

  async getPromocionAnual(
    paralelo_id:    string,
    gestion_id:     string,
    institucion_id: string,
  ) {
    const gestion = await prisma.gestion.findUnique({
      where:   { id: gestion_id },
      include: {
        trimestres:  { orderBy: { numero: 'asc' } },
        institucion: { select: { id: true } },
      },
    })
    if (!gestion) throw new AppError(404, 'Gestión no encontrada', 'NOT_FOUND')
    if (gestion.institucion.id !== institucion_id) throw new AppError(403, 'Sin acceso', 'FORBIDDEN')
    if (gestion.trimestres.some(t => !t.cerrado)) {
      throw new AppError(422, 'Todos los trimestres deben estar cerrados para calcular la promoción', 'TRIMESTERS_OPEN')
    }

    const [dimensionesRaw, asignaciones, matriculas] = await Promise.all([
      prisma.dimension.findMany({ where: { institucion_id }, orderBy: { orden: 'asc' } }),
      prisma.asignacion.findMany({
        where:   { paralelo_id, gestion_id },
        include: {
          materia: { select: { nombre: true } },
          indicadores: {
            include: { notas: { select: { estudiante_id: true, puntaje: true } } },
          },
        },
      }),
      prisma.matricula.findMany({
        where:   { paralelo_id, gestion_id },
        include: { estudiante: { include: { usuario: { select: { nombre: true, apellido: true } } } } },
        orderBy: [
          { estudiante: { usuario: { apellido: 'asc' } } },
          { estudiante: { usuario: { nombre:   'asc' } } },
        ],
      }),
    ])

    const dimensiones: DimInfo[] = dimensionesRaw.map(d => ({
      id: d.id, nombre: d.nombre, puntaje_max: d.puntaje_max, orden: d.orden,
    }))

    const trimestres = gestion.trimestres // [T1, T2, T3]

    return matriculas.map(m => {
      const est = m.estudiante

      // For each asignacion (materia), calculate T1/T2/T3 totals
      const notas_por_materia = asignaciones.map(asig => {
        const trimNotas = trimestres.map(trim => {
          const inds = asig.indicadores
            .filter(i => i.trimestre_id === trim.id)
            .map(i => ({
              id:           i.id,
              dimension_id: i.dimension_id,
            }))

          if (inds.length === 0) return null

          const notasMap = new Map<string, number | null>()
          for (const ind of asig.indicadores.filter(i => i.trimestre_id === trim.id)) {
            const nota = ind.notas.find(n => n.estudiante_id === est.id)
            notasMap.set(ind.id, nota?.puntaje ?? null)
          }

          const { total, hasAny } = calcNotasEstudiante(inds, notasMap, dimensiones)
          return hasAny ? total : null
        })

        const [t1, t2, t3] = trimNotas
        const promedio_anual = calcularPromedioAnual(t1 ?? null, t2 ?? null, t3 ?? null)
        return {
          materia:       asig.materia.nombre,
          t1:            t1 ?? null,
          t2:            t2 ?? null,
          t3:            t3 ?? null,
          promedio_anual,
          resultado:     promedio_anual > 50 ? 'APROBADO' as const : 'REPROBADO' as const,
        }
      })

      const resultado_final = determinarResultado(notas_por_materia.map(n => n.promedio_anual))
      const materias_reprobadas = notas_por_materia
        .filter(n => n.resultado === 'REPROBADO')
        .map(n => n.materia)

      return {
        estudiante: { nombre: est.usuario.nombre, apellido: est.usuario.apellido, codigo: est.codigo },
        notas_por_materia,
        resultado_final,
        materias_reprobadas,
      }
    })
  }

  // ── Reportes de Secretaría ───────────────────────────────────────────────

  async getNomina(
    institucion_id: string,
    gestion_id:     string,
    nivel_id?:      string,
    grado_id?:      string,
    paralelo_id?:   string,
  ) {
    const gestion = await verificarGestion(gestion_id, institucion_id)

    const matriculas = await prisma.matricula.findMany({
      where: {
        gestion_id,
        ...(paralelo_id ? { paralelo_id } : {}),
        paralelo: {
          ...(grado_id ? { grado_id } : {}),
          ...(nivel_id ? { grado: { nivel_id } } : {}),
        },
      },
      include: {
        estudiante: { include: { usuario: { select: { nombre: true, apellido: true, email: true } } } },
        paralelo:   { include: { grado: { include: { nivel: true } } } },
      },
      orderBy: [
        { paralelo: { grado: { orden: 'asc' } } },
        { paralelo: { letra: 'asc' } },
        { estudiante: { usuario: { apellido: 'asc' } } },
      ],
    })

    return {
      anno: gestion.anno,
      estudiantes: matriculas.map(m => ({
        codigo:   m.estudiante.codigo,
        nombre:   m.estudiante.usuario.nombre,
        apellido: m.estudiante.usuario.apellido,
        email:    m.estudiante.usuario.email,
        nivel:    m.paralelo.grado.nivel.nombre,
        grado:    m.paralelo.grado.nombre,
        paralelo: m.paralelo.letra,
        estado:   m.estado,
      })),
    }
  }

  async getFichaEstudiante(estudiante_id: string, institucion_id: string) {
    const estudiante = await prisma.estudiante.findUnique({
      where: { id: estudiante_id },
      include: {
        usuario: true,
        matriculas: {
          include: { paralelo: { include: { grado: { include: { nivel: true } } } }, gestion: { select: { anno: true } } },
          orderBy: { gestion: { anno: 'desc' } },
        },
        relaciones_padre: {
          include: { padre: { select: { nombre: true, apellido: true, email: true, telefono: true } } },
        },
      },
    })
    if (!estudiante) throw new AppError(404, 'Estudiante no encontrado', 'NOT_FOUND')
    if (estudiante.usuario.institucion_id !== institucion_id) throw new AppError(403, 'Sin acceso', 'FORBIDDEN')

    return {
      datos_personales: {
        nombre:           estudiante.usuario.nombre,
        apellido:         estudiante.usuario.apellido,
        email:            estudiante.usuario.email,
        telefono:         estudiante.usuario.telefono,
        codigo:           estudiante.codigo,
        fecha_nacimiento: estudiante.fecha_nacimiento,
        sexo:             estudiante.sexo,
        becado:           estudiante.becado,
        motivo_beca:      estudiante.motivo_beca,
      },
      matriculas: estudiante.matriculas.map(m => ({
        anno:          m.gestion.anno,
        nivel:         m.paralelo.grado.nivel.nombre,
        grado:         m.paralelo.grado.nombre,
        paralelo:      m.paralelo.letra,
        estado:        m.estado,
        lleva_tecnica: m.lleva_tecnica,
      })),
      tutores: estudiante.relaciones_padre.map(r => ({
        nombre:   r.padre.nombre,
        apellido: r.padre.apellido,
        email:    r.padre.email,
        telefono: r.padre.telefono,
      })),
    }
  }

  async getEstadisticaMatricula(institucion_id: string, gestion_id: string) {
    const gestion = await verificarGestion(gestion_id, institucion_id)

    const matriculas = await prisma.matricula.findMany({
      where: { gestion_id },
      include: {
        estudiante: { select: { sexo: true } },
        paralelo:   { include: { grado: { include: { nivel: true } } } },
      },
    })

    const porNivel: Record<string, number> = {}
    const porGradoParalelo = new Map<string, { nivel: string; grado: string; paralelo: string; total: number }>()
    const porSexo: Record<string, number> = { M: 0, F: 0, 'Sin registrar': 0 }

    for (const m of matriculas) {
      const nivel = m.paralelo.grado.nivel.nombre
      porNivel[nivel] = (porNivel[nivel] ?? 0) + 1

      const key = `${m.paralelo.grado_id}::${m.paralelo_id}`
      const entry = porGradoParalelo.get(key)
        ?? { nivel, grado: m.paralelo.grado.nombre, paralelo: m.paralelo.letra, total: 0 }
      entry.total++
      porGradoParalelo.set(key, entry)

      const sexo = m.estudiante.sexo ?? 'Sin registrar'
      porSexo[sexo] = (porSexo[sexo] ?? 0) + 1
    }

    return {
      anno:               gestion.anno,
      total:              matriculas.length,
      por_nivel:          Object.entries(porNivel).map(([nivel, total]) => ({ nivel, total })),
      por_grado_paralelo: [...porGradoParalelo.values()],
      por_sexo:           porSexo,
    }
  }

  async getPadresTutores(institucion_id: string, gestion_id: string, paralelo_id?: string) {
    await verificarGestion(gestion_id, institucion_id)

    const matriculas = await prisma.matricula.findMany({
      where: { gestion_id, ...(paralelo_id ? { paralelo_id } : {}) },
      include: {
        estudiante: {
          include: {
            usuario: { select: { nombre: true, apellido: true } },
            relaciones_padre: {
              include: { padre: { select: { nombre: true, apellido: true, email: true, telefono: true } } },
            },
          },
        },
        paralelo: { include: { grado: { include: { nivel: true } } } },
      },
      orderBy: [{ estudiante: { usuario: { apellido: 'asc' } } }],
    })

    const filas: Array<{
      estudiante: string; codigo: string; nivel: string; grado: string; paralelo: string
      tutor: string; email: string; telefono: string | null
    }> = []

    for (const m of matriculas) {
      const est  = m.estudiante
      const base = {
        estudiante: `${est.usuario.apellido} ${est.usuario.nombre}`,
        codigo:     est.codigo,
        nivel:      m.paralelo.grado.nivel.nombre,
        grado:      m.paralelo.grado.nombre,
        paralelo:   m.paralelo.letra,
      }
      if (est.relaciones_padre.length === 0) {
        filas.push({ ...base, tutor: '—', email: '—', telefono: null })
      } else {
        for (const rel of est.relaciones_padre) {
          filas.push({
            ...base,
            tutor:    `${rel.padre.apellido} ${rel.padre.nombre}`,
            email:    rel.padre.email,
            telefono: rel.padre.telefono,
          })
        }
      }
    }
    return filas
  }

  async getEstudiantesPorEstado(institucion_id: string, gestion_id: string, estado?: EstadoMatricula) {
    await verificarGestion(gestion_id, institucion_id)

    const matriculas = await prisma.matricula.findMany({
      where: { gestion_id, ...(estado ? { estado } : {}) },
      include: {
        estudiante: { include: { usuario: { select: { nombre: true, apellido: true } } } },
        paralelo:   { include: { grado: { include: { nivel: true } } } },
      },
      orderBy: [{ estudiante: { usuario: { apellido: 'asc' } } }],
    })

    const resumen: Record<EstadoMatricula, number> = { ACTIVO: 0, RETIRADO: 0, TRASLADADO: 0 } as Record<EstadoMatricula, number>
    const estudiantes = matriculas.map(m => {
      resumen[m.estado] = (resumen[m.estado] ?? 0) + 1
      return {
        estudiante_id: m.estudiante_id,
        nombre:        m.estudiante.usuario.nombre,
        apellido:      m.estudiante.usuario.apellido,
        codigo:        m.estudiante.codigo,
        nivel:         m.paralelo.grado.nivel.nombre,
        grado:         m.paralelo.grado.nombre,
        paralelo:      m.paralelo.letra,
        estado:        m.estado,
      }
    })
    return { resumen, estudiantes }
  }
}
