import { prisma } from '@edusync/database'
import { AppError } from '../middlewares/errorHandler'

// ─── Cómputo de períodos (mismo algoritmo que SeccionTurnosHorarios.tsx en el frontend) ───

interface RecreoPeriodo { despues_de_periodo: number; duracion_min: number }

function addMinutes(hhmm: string, mins: number): string {
  const [h, m] = hhmm.split(':').map(Number)
  const total  = (h ?? 0) * 60 + (m ?? 0) + mins
  const hh = Math.floor(total / 60) % 24
  const mm = total % 60
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

/** Períodos "de clase" (excluye lectura/recreos) con su hora de inicio, en orden. */
function computePeriodos(
  horaInicio: string, minutosLectura: number, duracionPeriodo: number,
  maxPeriodos: number, recreos: RecreoPeriodo[],
): { numero: number; hora_inicio: string; hora_fin: string }[] {
  const periodos: { numero: number; hora_inicio: string; hora_fin: string }[] = []
  let hora = addMinutes(horaInicio, minutosLectura)
  const recreoMap = new Map(recreos.map(r => [r.despues_de_periodo, r.duracion_min]))

  for (let p = 1; p <= maxPeriodos; p++) {
    const fin = addMinutes(hora, duracionPeriodo)
    periodos.push({ numero: p, hora_inicio: hora, hora_fin: fin })
    hora = fin
    const rec = recreoMap.get(p)
    if (rec) hora = addMinutes(hora, rec)
  }
  return periodos
}

const DIAS_LABEL = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

// ─── Abreviaturas (mismo criterio que MiHorarioPage.tsx en el frontend) ───

const STOP_PALABRAS = new Set(['y', 'de', 'del', 'la', 'el', 'en', 'con', 'e', 'los', 'las'])

function abreviarMateria(nombre: string): string {
  const palabras = nombre.split(/[\s,:()]+/).filter(w => w && !STOP_PALABRAS.has(w.toLowerCase()))
  if (palabras.length === 0) return nombre.slice(0, 3).toUpperCase()
  if (palabras.length === 1) return palabras[0]!.slice(0, 3).toUpperCase()
  return palabras.slice(0, 4).map(w => w[0]).join('').toUpperCase()
}

function abreviarNivel(nivelNombre: string): string {
  const n = nivelNombre.toUpperCase()
  if (n.startsWith('SEC'))  return 'Sec'
  if (n.startsWith('PRIM')) return 'Pri'
  if (n.startsWith('INIC')) return 'Ini'
  return nivelNombre.slice(0, 3)
}

function abreviarCurso(gradoNombre: string, letra: string, nivelNombre: string): string {
  const num = gradoNombre.match(/^(\d+°)/)?.[1] ?? gradoNombre.slice(0, 2)
  return `${num}${letra} ${abreviarNivel(nivelNombre)}`
}

export class HorariosService {
  private async getDocente(usuario_id: string) {
    const docente = await prisma.docente.findUnique({ where: { usuario_id } })
    if (!docente) throw new AppError(404, 'Perfil de docente no encontrado', 'NOT_FOUND')
    return docente
  }

  private async getGestionActiva(institucion_id: string) {
    const gestion = await prisma.gestion.findFirst({ where: { institucion_id, activa: true } })
    if (!gestion) throw new AppError(404, 'No hay una gestión activa', 'NOT_FOUND')
    return gestion
  }

  /** Materias/cursos del docente (para el selector de celda) + los períodos del día, calculados
   *  desde la configuración de turnos/horarios del nivel donde el docente tiene más asignaciones. */
  async getMiConfig(usuario_id: string, institucion_id: string) {
    const docente = await this.getDocente(usuario_id)
    const gestion  = await this.getGestionActiva(institucion_id)

    const asignaciones = await prisma.asignacion.findMany({
      where:   { docente_id: docente.id, gestion_id: gestion.id },
      include: {
        materia:  { select: { nombre: true, campo: { select: { nombre: true } } } },
        paralelo: { include: { grado: { include: { nivel: true } } } },
      },
      orderBy: [{ paralelo: { grado: { orden: 'asc' } } }, { paralelo: { letra: 'asc' } }],
    })

    // Nivel donde el docente tiene más asignaciones — determina qué turno/horario se usa para
    // calcular las horas de cada período (un docente que enseña en varios niveles con turnos
    // distintos ve la hora de su nivel principal; puede igual asignar cualquiera de sus materias
    // a cualquier celda, la hora mostrada es solo referencial).
    const conteoPorNivel = new Map<string, number>()
    for (const a of asignaciones) {
      const nivelId = a.paralelo.grado.nivel.id
      conteoPorNivel.set(nivelId, (conteoPorNivel.get(nivelId) ?? 0) + 1)
    }
    const nivelPrincipalId = [...conteoPorNivel.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]

    const configHorario = await prisma.configHorario.findUnique({ where: { institucion_id } })
    const duracionPeriodo = configHorario?.duracion_periodo_min ?? 40

    let periodos: { numero: number; hora_inicio: string; hora_fin: string }[] = []

    if (nivelPrincipalId) {
      const paraleloDelNivel = asignaciones.find(a => a.paralelo.grado.nivel.id === nivelPrincipalId)?.paralelo
      let hn: { hora_inicio: string; minutos_lectura: number; max_periodos_dia: number; recreos: RecreoPeriodo[] } | null = null

      if (paraleloDelNivel) {
        const pt = await prisma.paraleloTurno.findUnique({
          where:   { paralelo_id: paraleloDelNivel.id },
          include: { turno: { include: { horarios_nivel: { include: { recreos: true } } } } },
        })
        hn = pt?.turno.horarios_nivel.find(h => h.nivel_id === nivelPrincipalId) ?? null
      }
      if (!hn) {
        const turno = await prisma.turno.findFirst({
          where:   { institucion_id, activo: true, horarios_nivel: { some: { nivel_id: nivelPrincipalId } } },
          include: { horarios_nivel: { where: { nivel_id: nivelPrincipalId }, include: { recreos: true } } },
        })
        hn = turno?.horarios_nivel[0] ?? null
      }
      if (hn) {
        periodos = computePeriodos(hn.hora_inicio, hn.minutos_lectura, duracionPeriodo, hn.max_periodos_dia, hn.recreos)
      }
    }
    if (periodos.length === 0) {
      periodos = Array.from({ length: 8 }, (_, i) => ({ numero: i + 1, hora_inicio: '', hora_fin: '' }))
    }

    return {
      gestion: { id: gestion.id, anno: gestion.anno },
      periodos,
      asignaciones: asignaciones.map(a => ({
        id:      a.id,
        materia: { nombre: a.materia.nombre, campo: a.materia.campo.nombre },
        paralelo: {
          id: a.paralelo_id, letra: a.paralelo.letra,
          grado: { nombre: a.paralelo.grado.nombre, nivel: { nombre: a.paralelo.grado.nivel.nombre } },
        },
      })),
    }
  }

  async getMio(usuario_id: string, institucion_id: string) {
    const docente = await this.getDocente(usuario_id)
    const gestion  = await this.getGestionActiva(institucion_id)
    const horarios = await prisma.horario.findMany({
      where:   { docente_id: docente.id, gestion_id: gestion.id },
      include: {
        materia:  { select: { nombre: true } },
        paralelo: { select: { letra: true, grado: { select: { nombre: true, nivel: { select: { nombre: true } } } } } },
      },
    })
    if (horarios.length === 0) return []

    // Horario no tiene FK a Asignacion (no existe ese campo) — se resuelve cruzando
    // por los mismos 4 campos que identifican a una asignación de forma única
    // (@@unique([docente_id, materia_id, paralelo_id, gestion_id])). Así el frontend
    // puede saber, por ejemplo, qué días de la semana tiene clase cada asignación.
    const asignaciones = await prisma.asignacion.findMany({
      where:  { docente_id: docente.id, gestion_id: gestion.id },
      select: { id: true, materia_id: true, paralelo_id: true },
    })
    const asignacionPorClave = new Map(asignaciones.map(a => [`${a.materia_id}-${a.paralelo_id}`, a.id]))

    return horarios.map(h => ({
      ...h,
      asignacion_id: asignacionPorClave.get(`${h.materia_id}-${h.paralelo_id}`) ?? null,
    }))
  }

  /** Reemplaza TODO el horario del docente (gestión activa) por el estado recibido —
   *  edición en lote: el frontend acumula cambios en memoria y guarda todo de una vez. */
  async guardarHorarioCompleto(usuario_id: string, institucion_id: string, celdas: {
    dia_semana: number
    periodo:    number
    asignacion_id: string
  }[]) {
    const docente = await this.getDocente(usuario_id)
    const gestion  = await this.getGestionActiva(institucion_id)

    for (const c of celdas) {
      if (!Number.isInteger(c.dia_semana) || c.dia_semana < 1 || c.dia_semana > 6) {
        throw new AppError(400, 'Día inválido', 'VALIDATION')
      }
      if (!Number.isInteger(c.periodo) || c.periodo < 1) {
        throw new AppError(400, 'Período inválido', 'VALIDATION')
      }
    }
    const claves = new Set<string>()
    for (const c of celdas) {
      const clave = `${c.dia_semana}-${c.periodo}`
      if (claves.has(clave)) throw new AppError(400, 'Hay más de una materia en la misma celda', 'VALIDATION')
      claves.add(clave)
    }

    const asignacionIds = [...new Set(celdas.map(c => c.asignacion_id))]
    const asignaciones = asignacionIds.length > 0
      ? await prisma.asignacion.findMany({ where: { id: { in: asignacionIds }, docente_id: docente.id, gestion_id: gestion.id } })
      : []
    const asignacionMap = new Map(asignaciones.map(a => [a.id, a]))
    for (const id of asignacionIds) {
      if (!asignacionMap.has(id)) throw new AppError(403, 'Una de las materias no te pertenece', 'FORBIDDEN')
    }

    await prisma.$transaction([
      prisma.horario.deleteMany({ where: { docente_id: docente.id, gestion_id: gestion.id } }),
      ...(celdas.length > 0 ? [prisma.horario.createMany({
        data: celdas.map(c => {
          const a = asignacionMap.get(c.asignacion_id)!
          return {
            docente_id: docente.id, gestion_id: gestion.id,
            dia_semana: c.dia_semana, periodo: c.periodo,
            paralelo_id: a.paralelo_id, materia_id: a.materia_id,
          }
        }),
      })] : []),
    ])

    return this.getMio(usuario_id, institucion_id)
  }

  /** Tabla lista para exportar (PDF/Excel): una fila por período, una columna por día. */
  async getMiTabla(usuario_id: string, institucion_id: string) {
    const docente = await prisma.docente.findUnique({ where: { usuario_id }, include: { usuario: true } })
    if (!docente) throw new AppError(404, 'Perfil de docente no encontrado', 'NOT_FOUND')

    const [config, entradas] = await Promise.all([
      this.getMiConfig(usuario_id, institucion_id),
      this.getMio(usuario_id, institucion_id),
    ])

    const mapa = new Map<string, string>()
    for (const e of entradas) {
      const mat = abreviarMateria(e.materia.nombre)
      const cur = abreviarCurso(e.paralelo.grado.nombre, e.paralelo.letra, e.paralelo.grado.nivel.nombre)
      mapa.set(`${e.dia_semana}-${e.periodo}`, `${mat}\n${cur}`)
    }

    const columnas = [
      { header: 'Período', key: 'periodo' },
      ...[1, 2, 3, 4, 5, 6].map(d => ({ header: DIAS_LABEL[d]!, key: `d${d}` })),
    ]
    const filas = config.periodos.map(p => {
      const fila: Record<string, string> = {
        periodo: p.hora_inicio ? `P${p.numero} (${p.hora_inicio}-${p.hora_fin})` : `Período ${p.numero}`,
      }
      for (let d = 1; d <= 6; d++) fila[`d${d}`] = mapa.get(`${d}-${p.numero}`) ?? ''
      return fila
    })

    return {
      docente: `${docente.usuario.nombre} ${docente.usuario.apellido}`,
      gestion: config.gestion.anno,
      columnas,
      filas,
    }
  }
}
