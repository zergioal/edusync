import { prisma } from '@edusync/database'
import { AppError } from '../middlewares/errorHandler'
import { BoletinesService } from './boletines.service'
import { Instrumento } from '@edusync/types'
import { calcNotasEstudiante, type DimInfo } from './calculo.service'
import { NotaExtracurricularService } from './notas-extracurriculares.service'

type Escala = 'ED' | 'DA' | 'DO' | 'DP'

function calcEscala(total: number): Escala {
  if (total <= 50) return 'ED'
  if (total <= 68) return 'DA'
  if (total <= 84) return 'DO'
  return 'DP'
}

/** Indicadores por defecto con los que se siembra cada dimensión la primera vez que se abre la planilla de un trimestre. */
const INDICADORES_DEFECTO: Record<string, Array<{ nombre: string; instrumento: Instrumento }>> = {
  SER_DECIDIR: [
    { nombre: 'Observación de valores', instrumento: Instrumento.OBSERVACION },
  ],
  SABER: [
    { nombre: 'Prueba escrita 1', instrumento: Instrumento.EVALUACION_ESCRITA },
    { nombre: 'Prueba escrita 2', instrumento: Instrumento.EVALUACION_ESCRITA },
  ],
  HACER: [
    { nombre: 'Cuaderno de trabajo', instrumento: Instrumento.CUADERNO },
    { nombre: 'Trabajo práctico', instrumento: Instrumento.DEFENSA },
  ],
  AUTOEVALUACION: [
    { nombre: 'Autoevaluación', instrumento: Instrumento.OBSERVACION },
  ],
}

/**
 * Calcula notas/promedios/total/escala de un estudiante a partir de sus dimensiones+indicadores y su
 * mapa de notas. `notaExtracurricular` (ver NotaExtracurricular / notas-extracurriculares.service.ts)
 * se suma al total sin pertenecer a ninguna dimensión, y se devuelve tal cual para que el registro del
 * docente la muestre como una columna más — de solo lectura para él.
 */
export function calcularFilaEstudiante(
  dimensiones: Array<{ id: string; indicadores: Array<{ id: string }> }>,
  notasDeEstudiante: Map<string, number | null>,
  notaExtracurricular: number | null = null,
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

  const extra = notaExtracurricular ?? 0
  total += extra
  hasAny = hasAny || extra !== 0

  return {
    notas:    notasObj,
    promedios,
    notaExtracurricular,
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
        materia: {
          include: {
            campo: true,
            parent_materia: { select: { nombre: true } },
            // Subáreas especiales hermanas: sus columnas se anexan de solo lectura al registro del área.
            subareas: { where: { es_especial: true, activa: true }, select: { id: true } },
          },
        },
        paralelo: { include: { grado: { include: { nivel: true } } } },
        gestion:  { include: { trimestres: { orderBy: { numero: 'asc' as const } } } },
      },
    })
    if (!asignacion) throw new AppError(404, 'Asignación no encontrada', 'NOT_FOUND')

    const institucion_id = asignacion.docente.usuario.institucion_id
    const gestion_id     = asignacion.gestion.id
    const esEspecial     = asignacion.materia.es_especial
    const hijasEspecialesIds = asignacion.materia.subareas.map(s => s.id)

    // Vista de una subárea especial (profesor B): solo sus dimensiones habilitadas — nunca
    // Ser/Decidir ni Autoevaluación si no fueron marcadas.
    const dimensionesWhere = esEspecial
      ? { institucion_id, id: { in: asignacion.materia.dimensiones_especiales } }
      : { institucion_id }

    // Query 2+3: dimensiones y matrículas en paralelo
    const [dimensiones, matriculas] = await Promise.all([
      prisma.dimension.findMany({
        where: dimensionesWhere,
        include: {
          indicadores: {
            where:   { asignacion_id, ...(trimestre_id ? { trimestre_id } : {}) },
            orderBy: { orden: 'asc' },
          },
        },
        orderBy: { orden: 'asc' },
      }),
      prisma.matricula.findMany({
        where: { paralelo_id: asignacion.paralelo_id, gestion_id, estudiante: { estado: 'ACTIVO' } },
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

    // Auto-siembra: la primera vez que se abre la planilla de un trimestre, cada dimensión sin
    // indicadores propios recibe su set por defecto (ver INDICADORES_DEFECTO). No aplica a una
    // subárea especial: su única columna se crea aparte, fija, justo abajo.
    if (trimestre_id && !esEspecial) {
      const trimestre = asignacion.gestion.trimestres.find(t => t.id === trimestre_id)
      if (trimestre) {
        await Promise.all(dimensiones.map(async dim => {
          if (dim.indicadores.length > 0) return
          const defaults = INDICADORES_DEFECTO[dim.nombre]
          if (!defaults) return
          const creados = await Promise.all(defaults.map((d, orden) =>
            prisma.indicador.create({
              data: {
                asignacion_id,
                dimension_id:     dim.id,
                trimestre_id,
                nombre:           d.nombre,
                instrumento:      d.instrumento,
                fecha_aplicacion: trimestre.fecha_inicio,
                orden,
              },
            })
          ))
          dim.indicadores = creados
        }))
      }
    }

    // Auto-creación de la columna fija de la subárea especial: una nota por dimensión habilitada,
    // que el docente de la subárea solo puede calificar (no renombrar/eliminar), igual que ya
    // ocurre con el indicador fijo de Autoevaluación.
    if (trimestre_id && esEspecial) {
      const trimestre = asignacion.gestion.trimestres.find(t => t.id === trimestre_id)
      if (trimestre) {
        await Promise.all(dimensiones.map(async dim => {
          if (dim.indicadores.length > 0) return
          const creado = await prisma.indicador.create({
            data: {
              asignacion_id,
              dimension_id:     dim.id,
              trimestre_id,
              nombre:           asignacion.materia.nombre,
              instrumento:      Instrumento.OBSERVACION,
              fecha_aplicacion: trimestre.fecha_inicio,
              orden: 0,
            },
          })
          dim.indicadores = [creado]
        }))
      }
    }

    // Columnas ajenas de solo lectura: del profesor A se anexan las de sus subáreas especiales
    // hermanas; de una subárea especial (profesor B) se antepone la del área principal.
    type IndicadorConOrigen = (typeof dimensiones)[number]['indicadores'][number] & {
      editable: boolean; origen_docente: string | null
    }
    let indicadoresAjenos: IndicadorConOrigen[] = []

    if (!esEspecial && hijasEspecialesIds.length > 0) {
      const hijasAsigs = await prisma.asignacion.findMany({
        where: { materia_id: { in: hijasEspecialesIds }, paralelo_id: asignacion.paralelo_id, gestion_id },
        include: {
          docente:     { include: { usuario: { select: { nombre: true, apellido: true } } } },
          indicadores: { where: { ...(trimestre_id ? { trimestre_id } : {}) } },
        },
      })
      indicadoresAjenos = hijasAsigs.flatMap(a => a.indicadores.map(i => ({
        ...i, editable: false, origen_docente: `${a.docente.usuario.nombre} ${a.docente.usuario.apellido}`,
      })))
    } else if (esEspecial && asignacion.materia.es_subarea_de_id) {
      const padreAsig = await prisma.asignacion.findFirst({
        where: { materia_id: asignacion.materia.es_subarea_de_id, paralelo_id: asignacion.paralelo_id, gestion_id },
        include: {
          docente:     { include: { usuario: { select: { nombre: true, apellido: true } } } },
          indicadores: {
            where: {
              dimension_id: { in: asignacion.materia.dimensiones_especiales },
              ...(trimestre_id ? { trimestre_id } : {}),
            },
          },
        },
      })
      if (padreAsig) {
        indicadoresAjenos = padreAsig.indicadores.map(i => ({
          ...i, editable: false, origen_docente: `${padreAsig.docente.usuario.nombre} ${padreAsig.docente.usuario.apellido}`,
        }))
      }
    }

    for (const dim of dimensiones) {
      const propios: IndicadorConOrigen[] = dim.indicadores.map(i => ({ ...i, editable: true, origen_docente: null }))
      const ajenos  = indicadoresAjenos.filter(i => i.dimension_id === dim.id)
      // En la vista de la subárea especial, la columna del área principal va antes que la propia;
      // en la vista del área principal, las columnas de sus subáreas especiales van al final.
      dim.indicadores = (esEspecial ? [...ajenos, ...propios] : [...propios, ...ajenos]) as typeof dim.indicadores
    }

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

    // Nota extracurricular (solo editable por admin/director/coordinador/secretaría) — se suma al
    // total y se muestra como una columna más en el registro, de solo lectura para el docente.
    const notaExtraMap = trimestre_id
      ? await new NotaExtracurricularService().getMapa([asignacion_id], trimestre_id)
      : new Map<string, number>()

    const estudiantes = matriculas.map(m => {
      const est      = m.estudiante
      const estNotas = notasMap.get(est.id) ?? new Map<string, number | null>()
      const notaExtracurricular = notaExtraMap.get(`${asignacion_id}:${est.id}`) ?? null
      const fila     = calcularFilaEstudiante(dimensiones, estNotas, notaExtracurricular)

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

  /** Mini-centralizador de una asignación: total/escala de cada estudiante por trimestre + proyección de aprobación. */
  async getCentralizadorAsignacion(asignacion_id: string) {
    const asignacion = await prisma.asignacion.findUnique({
      where: { id: asignacion_id },
      include: {
        docente:  { include: { usuario: { select: { nombre: true, apellido: true, institucion_id: true } } } },
        materia:  { include: { subareas: { where: { es_especial: true, activa: true }, select: { id: true } } } },
        paralelo: { include: { grado: { include: { nivel: true } } } },
        gestion:  { include: { trimestres: { orderBy: { numero: 'asc' as const } } } },
      },
    })
    if (!asignacion) throw new AppError(404, 'Asignación no encontrada', 'NOT_FOUND')

    const institucion_id = asignacion.docente.usuario.institucion_id
    const trimestres      = asignacion.gestion.trimestres

    const [dimensiones, matriculas] = await Promise.all([
      prisma.dimension.findMany({
        where: { institucion_id },
        include: { indicadores: { where: { asignacion_id } } },
        orderBy: { orden: 'asc' },
      }),
      prisma.matricula.findMany({
        where: { paralelo_id: asignacion.paralelo_id, gestion_id: asignacion.gestion_id, estudiante: { estado: 'ACTIVO' } },
        include: { estudiante: { include: { usuario: { select: { nombre: true, apellido: true } } } } },
        orderBy: [
          { estudiante: { usuario: { apellido: 'asc' } } },
          { estudiante: { usuario: { nombre:   'asc' } } },
        ],
      }),
    ])

    // Si esta materia tiene subáreas especiales hermanas, sus notas se suman aquí también —
    // el total que ve el profesor A debe coincidir con el que ya ve en su registro.
    const hijasEspecialesIds = asignacion.materia.subareas.map(s => s.id)
    if (hijasEspecialesIds.length > 0) {
      const hijasAsigs = await prisma.asignacion.findMany({
        where:   { materia_id: { in: hijasEspecialesIds }, paralelo_id: asignacion.paralelo_id, gestion_id: asignacion.gestion_id },
        include: { indicadores: true },
      })
      const extra = hijasAsigs.flatMap(a => a.indicadores)
      for (const dim of dimensiones) {
        dim.indicadores = [...dim.indicadores, ...extra.filter(i => i.dimension_id === dim.id)]
      }
    }

    const indicadorIds  = dimensiones.flatMap(d => d.indicadores.map(i => i.id))
    const estudianteIds = matriculas.map(m => m.estudiante_id)
    const notas = indicadorIds.length > 0 && estudianteIds.length > 0
      ? await prisma.notaIndicador.findMany({
          where: { indicador_id: { in: indicadorIds }, estudiante_id: { in: estudianteIds } },
        })
      : []

    const notasMap = new Map<string, Map<string, number | null>>()
    for (const nota of notas) {
      if (!notasMap.has(nota.estudiante_id)) notasMap.set(nota.estudiante_id, new Map())
      notasMap.get(nota.estudiante_id)!.set(nota.indicador_id, nota.puntaje ?? null)
    }

    const META = 51 * trimestres.length // mínimo aprobado (escala DA) × cantidad de trimestres de la gestión

    const notaExtraMap = await new NotaExtracurricularService().getMapaMultiTrimestre([asignacion.id], trimestres.map(t => t.id))

    const estudiantes = matriculas.map(m => {
      const est      = m.estudiante
      const estNotas = notasMap.get(est.id) ?? new Map<string, number | null>()

      const totales: Record<string, number | null> = {}
      const escalas: Record<string, Escala | null> = {}
      for (const trim of trimestres) {
        const dimsTrim = dimensiones.map(d => ({
          id: d.id,
          indicadores: d.indicadores.filter(i => i.trimestre_id === trim.id),
        }))
        const notaExtracurricular = notaExtraMap.get(`${asignacion.id}:${est.id}:${trim.id}`) ?? null
        const fila = calcularFilaEstudiante(dimsTrim, estNotas, notaExtracurricular)
        totales[trim.id] = fila.total
        escalas[trim.id] = fila.escala
      }

      const acumulado  = trimestres.reduce((s, t) => s + (totales[t.id] ?? 0), 0)
      const pendientes = trimestres.filter(t => totales[t.id] == null)

      let observacion: string
      if (pendientes.length === 0) {
        observacion = acumulado >= META ? 'Aprobado' : 'No alcanza el mínimo anual'
      } else {
        const faltante = Math.max(META - acumulado, 0)
        if (faltante === 0) {
          observacion = 'Ya asegura la promoción'
        } else {
          const porTrimestre = Math.ceil(faltante / pendientes.length)
          const nombres = pendientes.map(t => `${t.numero}°`).join(' y ')
          observacion = `Necesita ${faltante} pts (~${porTrimestre} c/u en ${nombres} trimestre${pendientes.length > 1 ? 's' : ''}) para aprobar`
        }
      }

      return {
        id:       est.id,
        nombre:   est.usuario.nombre,
        apellido: est.usuario.apellido,
        codigo:   est.codigo,
        totales,
        escalas,
        observacion,
      }
    })

    return {
      asignacion: {
        id:       asignacion.id,
        materia:  asignacion.materia,
        paralelo: asignacion.paralelo,
        gestion:  { id: asignacion.gestion.id, anno: asignacion.gestion.anno },
      },
      trimestres: trimestres.map(t => ({ id: t.id, numero: t.numero })),
      meta: META,
      estudiantes,
    }
  }

  /**
   * Centralizador de subáreas: para un docente que dicta una subárea, muestra las notas de todas las
   * subáreas hermanas del mismo curso (mismo padre, mismo paralelo/gestión) y el promedio combinado que
   * repercutirá en el boletín — misma fórmula que BoletinesService usa para la fila combinada.
   */
  async getCentralizadorSubareas(asignacion_id: string, trimestre_id: string) {
    const asignacion = await prisma.asignacion.findUnique({
      where:   { id: asignacion_id },
      include: {
        docente: { include: { usuario: { select: { institucion_id: true } } } },
        materia: { include: { parent_materia: { select: { id: true, nombre: true, solo_si_bth: true } } } },
      },
    })
    if (!asignacion) throw new AppError(404, 'Asignación no encontrada', 'NOT_FOUND')
    const padre = asignacion.materia.parent_materia
    if (!padre) throw new AppError(400, 'Esta asignación no corresponde a una subárea', 'VALIDATION')

    const institucion_id = asignacion.docente.usuario.institucion_id
    const { paralelo_id, gestion_id } = asignacion

    const [dimensionesRaw, subareaAsigs, matriculas] = await Promise.all([
      prisma.dimension.findMany({ where: { institucion_id }, orderBy: { orden: 'asc' } }),
      prisma.asignacion.findMany({
        where:   { paralelo_id, gestion_id, materia: { es_subarea_de_id: padre.id } },
        include: {
          materia:     true,
          docente:     { include: { usuario: { select: { nombre: true, apellido: true } } } },
          indicadores: { where: { trimestre_id }, select: { id: true, dimension_id: true } },
        },
        orderBy: { materia: { nombre: 'asc' } },
      }),
      prisma.matricula.findMany({
        where:   { paralelo_id, gestion_id, estudiante: { estado: 'ACTIVO' } },
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

    const estudiantesQueCursan = padre.solo_si_bth
      ? matriculas.filter(m => m.lleva_tecnica ?? true)
      : matriculas

    const indicadorIds  = subareaAsigs.flatMap(a => a.indicadores.map(i => i.id))
    const estudianteIds = estudiantesQueCursan.map(m => m.estudiante_id)
    const notas = indicadorIds.length > 0 && estudianteIds.length > 0
      ? await prisma.notaIndicador.findMany({
          where: { indicador_id: { in: indicadorIds }, estudiante_id: { in: estudianteIds } },
        })
      : []

    const notasIndex = new Map<string, Map<string, number | null>>()
    for (const nota of notas) {
      if (!notasIndex.has(nota.estudiante_id)) notasIndex.set(nota.estudiante_id, new Map())
      notasIndex.get(nota.estudiante_id)!.set(nota.indicador_id, nota.puntaje ?? null)
    }

    const estudiantes = estudiantesQueCursan.map(m => {
      const estNotas = notasIndex.get(m.estudiante_id) ?? new Map<string, number | null>()
      const notasSubareas = subareaAsigs.map(asig => {
        const { total, hasAny } = calcNotasEstudiante(asig.indicadores, estNotas, dimensiones)
        return { asignacion_id: asig.id, materia_id: asig.materia_id, nombre: asig.materia.nombre, total: hasAny ? total : null }
      })
      const conNota = notasSubareas.filter((n): n is typeof n & { total: number } => n.total !== null)
      const promedio = conNota.length > 0
        ? Math.round(conNota.reduce((s, n) => s + n.total, 0) / conNota.length)
        : null

      return {
        id:       m.estudiante_id,
        codigo:   m.estudiante.codigo,
        apellido: m.estudiante.usuario.apellido,
        nombre:   m.estudiante.usuario.nombre,
        notasSubareas,
        promedio,
      }
    })

    return {
      area_padre: padre.nombre,
      subareas: subareaAsigs.map(a => ({
        asignacion_id: a.id,
        nombre:        a.materia.nombre,
        docente:       `${a.docente.usuario.nombre} ${a.docente.usuario.apellido}`,
        es_esta:       a.id === asignacion_id,
      })),
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

  /** Vista de staff: cualquier estudiante de la institución (control de acceso por rol en la ruta). */
  async getParaStaff(estudiante_id: string, trimestre_id: string, institucion_id: string) {
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
    const asignacionesRaw = await prisma.asignacion.findMany({
      where: { paralelo_id: matricula.paralelo_id, gestion_id },
      include: {
        materia: {
          include: { campo: true, parent_materia: { select: { nombre: true, solo_si_bth: true } } },
        },
      },
      orderBy: [{ materia: { campo: { nombre: 'asc' } } }, { materia: { nombre: 'asc' } }],
    })
    // Las subáreas de un área normal se ven siempre; las del área técnica BTH (padre solo_si_bth)
    // respetan la electiva por estudiante (lleva_tecnica), igual que en boletines.service.ts. Una
    // asignación regular de una materia que ya "tiene_subareas" se excluye (evita fila duplicada si
    // quedó una asignación directa de antes de que el área tuviera subáreas). Una subárea especial
    // nunca aparece como fila propia — su nota se diluye dentro del promedio del área principal.
    const asignaciones = asignacionesRaw.filter(a => {
      if (a.materia.es_especial) return false
      if (a.materia.es_subarea_de_id) return !a.materia.parent_materia?.solo_si_bth || llevaTecnica
      return !a.materia.tiene_subareas
    })
    const especialAsigs = asignacionesRaw.filter(a => a.materia.es_especial)

    const obsRecs = await prisma.observacionInicial.findMany({
      where: {
        estudiante_id,
        trimestre_id,
        docente_id: { in: asignaciones.map(a => a.docente_id) },
      },
    })
    const obsMap = new Map(obsRecs.map(o => [o.docente_id, o.contenido]))

    const asignacionIds = [...asignaciones.map(a => a.id), ...especialAsigs.map(a => a.id)]

    // Dimensiones + indicadores de TODAS las materias (incluidas las subáreas especiales) en una sola consulta
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

    const notaExtraMap = await new NotaExtracurricularService().getMapa(asignaciones.map(a => a.id), trimestre_id)

    const materias = asignaciones.map(asig => {
      // Dimensiones de esta materia: propios indicadores + los de sus subáreas especiales (si tiene)
      const especialesDeEstaMateria = especialAsigs.filter(e => e.materia.es_subarea_de_id === asig.materia_id)
      const notaExtracurricular = notaExtraMap.get(`${asig.id}:${estudiante_id}`) ?? null
      const dimsAsig = dimensiones.map(d => ({
        id:          d.id,
        nombre:      d.nombre,
        puntaje_max: d.puntaje_max,
        orden:       d.orden,
        indicadores: d.indicadores.filter(i =>
          i.asignacion_id === asig.id || especialesDeEstaMateria.some(e => e.id === i.asignacion_id)
        ),
      }))
      const fila = calcularFilaEstudiante(dimsAsig, notasDeEstudiante, notaExtracurricular)

      return {
        asignacion_id: asig.id,
        materia: {
          nombre:        asig.materia.nombre,
          campo:         asig.materia.campo.nombre,
          materia_padre: asig.materia.parent_materia?.nombre ?? null,
        },
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
