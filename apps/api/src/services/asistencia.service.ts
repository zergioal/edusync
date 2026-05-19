import { prisma } from '@edusync/database'
import { AppError } from '../middlewares/errorHandler'

interface RegistroAsistencia {
  estudiante_id: string
  estado: 'PRESENTE' | 'AUSENTE' | 'TARDANZA'
}

export class AsistenciaService {

  // ── Vistas estudiante/padre ────────────────────────────────────────────────

  async getMia(usuario_id: string, trimestre_id: string) {
    const estudiante = await prisma.estudiante.findFirst({ where: { usuario_id } })
    if (!estudiante) throw new AppError(404, 'Perfil de estudiante no encontrado', 'NOT_FOUND')
    return this.consolidada(estudiante.id, trimestre_id)
  }

  async getHijo(padre_usuario_id: string, estudiante_id: string, trimestre_id: string) {
    const rel = await prisma.relacionPadreHijo.findFirst({
      where: { padre_id: padre_usuario_id, estudiante_id },
    })
    if (!rel) throw new AppError(403, 'Sin acceso', 'FORBIDDEN')
    return this.consolidada(estudiante_id, trimestre_id)
  }

  // ── Asistencia de clase (docente) ─────────────────────────────────────────

  async registrarClase(
    asignacion_id: string,
    fecha: string,
    registros: RegistroAsistencia[],
    docente_usuario_id: string,
  ) {
    const asignacion = await prisma.asignacion.findUnique({
      where:   { id: asignacion_id },
      include: { docente: true },
    })
    if (!asignacion) throw new AppError(404, 'Asignación no encontrada', 'NOT_FOUND')
    if (asignacion.docente.usuario_id !== docente_usuario_id) {
      throw new AppError(403, 'Solo el docente asignado puede registrar asistencia', 'FORBIDDEN')
    }

    const fechaDate = new Date(fecha)

    await prisma.$transaction(
      registros.map(r =>
        prisma.asistenciaClase.upsert({
          where:  { asignacion_id_estudiante_id_fecha: { asignacion_id, estudiante_id: r.estudiante_id, fecha: fechaDate } },
          create: { asignacion_id, estudiante_id: r.estudiante_id, fecha: fechaDate, estado: r.estado },
          update: { estado: r.estado },
        }),
      ),
    )

    return { guardados: registros.length }
  }

  async getClase(asignacion_id: string, fecha: string) {
    const registros = await prisma.asistenciaClase.findMany({
      where:   { asignacion_id, fecha: new Date(fecha) },
      include: { estudiante: { include: { usuario: { select: { nombre: true, apellido: true } } } } },
      orderBy: { estudiante: { usuario: { apellido: 'asc' } } },
    })
    return registros.map(r => ({
      estudiante_id: r.estudiante_id,
      nombre:        r.estudiante.usuario.nombre,
      apellido:      r.estudiante.usuario.apellido,
      estado:        r.estado,
    }))
  }

  async reporteClase(
    institucion_id: string,
    opts: { paralelo_id: string; materia_id?: string; fecha_inicio: string; fecha_fin: string },
  ) {
    const asignaciones = await prisma.asignacion.findMany({
      where: {
        paralelo_id: opts.paralelo_id,
        ...(opts.materia_id ? { materia_id: opts.materia_id } : {}),
        gestion:     { institucion_id },
      },
      include: {
        materia:  { select: { nombre: true } },
        docente:  { include: { usuario: { select: { nombre: true, apellido: true } } } },
        asistencias: {
          where: {
            fecha: { gte: new Date(opts.fecha_inicio), lte: new Date(opts.fecha_fin) },
          },
        },
      },
    })

    return asignaciones.map(a => {
      const total     = a.asistencias.length
      const presentes = a.asistencias.filter(r => r.estado === 'PRESENTE').length
      const ausentes  = a.asistencias.filter(r => r.estado === 'AUSENTE').length
      const tardanzas = a.asistencias.filter(r => r.estado === 'TARDANZA').length
      return {
        asignacion_id:  a.id,
        materia:        a.materia.nombre,
        docente:        `${a.docente.usuario.apellido}, ${a.docente.usuario.nombre}`,
        total_registros: total,
        presentes,
        ausentes,
        tardanzas,
        porcentaje_asistencia: total > 0 ? Math.round((presentes / total) * 100) : null,
      }
    })
  }

  // ── Asistencia diaria (regente) ───────────────────────────────────────────

  async registrarDiaria(
    regente_usuario_id: string,
    paralelo_id: string,
    fecha: string,
    registros: RegistroAsistencia[],
  ) {
    const fechaDate = new Date(fecha)

    await prisma.$transaction(
      registros.map(r =>
        prisma.asistenciaDiaria.upsert({
          where:  { paralelo_id_estudiante_id_fecha: { paralelo_id, estudiante_id: r.estudiante_id, fecha: fechaDate } },
          create: { regente_id: regente_usuario_id, paralelo_id, estudiante_id: r.estudiante_id, fecha: fechaDate, estado: r.estado },
          update: { estado: r.estado, regente_id: regente_usuario_id },
        }),
      ),
    )

    return { guardados: registros.length }
  }

  async getDiaria(paralelo_id: string, fecha: string) {
    const registros = await prisma.asistenciaDiaria.findMany({
      where:   { paralelo_id, fecha: new Date(fecha) },
      include: { estudiante: { include: { usuario: { select: { nombre: true, apellido: true } } } } },
      orderBy: { estudiante: { usuario: { apellido: 'asc' } } },
    })
    return registros.map(r => ({
      estudiante_id: r.estudiante_id,
      nombre:        r.estudiante.usuario.nombre,
      apellido:      r.estudiante.usuario.apellido,
      estado:        r.estado,
    }))
  }

  async reporteDiaria(opts: {
    paralelo_id: string
    fecha_inicio: string
    fecha_fin: string
    estudiante_id?: string
  }) {
    const registros = await prisma.asistenciaDiaria.findMany({
      where: {
        paralelo_id: opts.paralelo_id,
        fecha:       { gte: new Date(opts.fecha_inicio), lte: new Date(opts.fecha_fin) },
        ...(opts.estudiante_id ? { estudiante_id: opts.estudiante_id } : {}),
      },
      include: { estudiante: { include: { usuario: { select: { nombre: true, apellido: true } } } } },
      orderBy: [{ estudiante: { usuario: { apellido: 'asc' } } }, { fecha: 'asc' }],
    })

    // Agrupar por estudiante
    const mapa = new Map<string, {
      estudiante_id: string
      nombre: string
      apellido: string
      presentes: number
      ausentes: number
      tardanzas: number
      total: number
      dias: Array<{ fecha: string; estado: string }>
    }>()

    for (const r of registros) {
      if (!mapa.has(r.estudiante_id)) {
        mapa.set(r.estudiante_id, {
          estudiante_id: r.estudiante_id,
          nombre:        r.estudiante.usuario.nombre,
          apellido:      r.estudiante.usuario.apellido,
          presentes:     0,
          ausentes:      0,
          tardanzas:     0,
          total:         0,
          dias:          [],
        })
      }
      const e = mapa.get(r.estudiante_id)!
      e.total++
      if (r.estado === 'PRESENTE')  e.presentes++
      if (r.estado === 'AUSENTE')   e.ausentes++
      if (r.estado === 'TARDANZA')  e.tardanzas++
      e.dias.push({ fecha: r.fecha.toISOString().slice(0, 10), estado: r.estado })
    }

    return Array.from(mapa.values()).map(e => ({
      ...e,
      porcentaje_asistencia: e.total > 0 ? Math.round((e.presentes / e.total) * 100) : null,
    }))
  }

  // ── Consolidada por estudiante ─────────────────────────────────────────────

  async consolidada(estudiante_id: string, trimestre_id: string) {
    const trimestre = await prisma.trimestre.findUnique({ where: { id: trimestre_id } })
    if (!trimestre) throw new AppError(404, 'Trimestre no encontrado', 'NOT_FOUND')

    const [diaria, clase] = await Promise.all([
      prisma.asistenciaDiaria.findMany({
        where:   { estudiante_id, fecha: { gte: trimestre.fecha_inicio, lte: trimestre.fecha_fin } },
        orderBy: { fecha: 'asc' },
      }),
      prisma.asistenciaClase.findMany({
        where: {
          estudiante_id,
          fecha: { gte: trimestre.fecha_inicio, lte: trimestre.fecha_fin },
        },
        include: { asignacion: { include: { materia: { select: { nombre: true } } } } },
        orderBy: { fecha: 'asc' },
      }),
    ])

    return {
      diaria: {
        total_asistencias: diaria.filter(r => r.estado === 'PRESENTE').length,
        total_faltas:      diaria.filter(r => r.estado === 'AUSENTE').length,
        total_tardanzas:   diaria.filter(r => r.estado === 'TARDANZA').length,
        dias: diaria.map(r => ({ fecha: r.fecha.toISOString().slice(0, 10), estado: r.estado })),
      },
      por_materia: Object.values(
        clase.reduce<Record<string, { materia: string; presentes: number; ausentes: number; tardanzas: number }>>((acc, r) => {
          const key = r.asignacion.materia.nombre
          if (!acc[key]) acc[key] = { materia: key, presentes: 0, ausentes: 0, tardanzas: 0 }
          if (r.estado === 'PRESENTE')  acc[key]!.presentes++
          if (r.estado === 'AUSENTE')   acc[key]!.ausentes++
          if (r.estado === 'TARDANZA')  acc[key]!.tardanzas++
          return acc
        }, {}),
      ),
    }
  }

  // ── Paralelos del regente (para selector) ────────────────────────────────

  async getParalelosRegente(usuario_id: string) {
    // Regente: paralelos donde haya registrado asistencia diaria o simplemente todos activos de la institución del usuario
    const usuario = await prisma.usuario.findUnique({
      where:   { id: usuario_id },
      include: { institucion: { include: { niveles: { include: { grados: { include: { paralelos: {
        where:   { activo: true },
        include: { grado: { include: { nivel: true } } },
        orderBy: [{ grado: { orden: 'asc' } }, { letra: 'asc' }],
      } } } } } } } },
    })
    if (!usuario) throw new AppError(404, 'Usuario no encontrado', 'NOT_FOUND')

    const paralelos: Array<{ id: string; nombre: string; grado: string; nivel: string }> = []
    for (const nivel of usuario.institucion.niveles) {
      for (const grado of nivel.grados) {
        for (const paralelo of grado.paralelos) {
          paralelos.push({
            id:     paralelo.id,
            nombre: `${grado.nombre} ${paralelo.letra}`,
            grado:  grado.nombre,
            nivel:  nivel.nombre,
          })
        }
      }
    }
    return paralelos
  }

  // ── Vista mensual de clase (docente) ────────────────────────────────────

  async getClaseMensual(asignacion_id: string, mes: string) {
    const [yearStr, monthStr] = mes.split('-')
    const year  = parseInt(yearStr!)
    const month = parseInt(monthStr!) - 1
    const inicio = new Date(year, month, 1)
    const fin    = new Date(year, month + 1, 0, 23, 59, 59, 999)

    const asig = await prisma.asignacion.findUnique({
      where:  { id: asignacion_id },
      select: { paralelo_id: true, gestion_id: true },
    })
    if (!asig) throw new AppError(404, 'Asignación no encontrada', 'NOT_FOUND')

    const [matriculas, registros] = await Promise.all([
      prisma.matricula.findMany({
        where:   { paralelo_id: asig.paralelo_id, gestion_id: asig.gestion_id },
        include: { estudiante: { include: { usuario: { select: { nombre: true, apellido: true } } } } },
        orderBy: { estudiante: { usuario: { apellido: 'asc' } } },
      }),
      prisma.asistenciaClase.findMany({
        where:   { asignacion_id, fecha: { gte: inicio, lte: fin } },
        select:  { estudiante_id: true, fecha: true, estado: true },
      }),
    ])

    return {
      estudiantes: matriculas.map(m => ({
        estudiante_id: m.estudiante_id,
        nombre:        m.estudiante.usuario.nombre,
        apellido:      m.estudiante.usuario.apellido,
      })),
      records: registros.reduce<Record<string, Record<string, string>>>((acc, r) => {
        const key = r.fecha.toISOString().slice(0, 10)
        if (!acc[key]) acc[key] = {}
        acc[key]![r.estudiante_id] = r.estado
        return acc
      }, {}),
    }
  }

  // ── Estudiantes de un paralelo (para carga de asistencia) ────────────────

  async getEstudiantesParalelo(paralelo_id: string, gestion_id: string) {
    const matriculas = await prisma.matricula.findMany({
      where:   { paralelo_id, gestion_id },
      include: {
        estudiante: {
          include: { usuario: { select: { nombre: true, apellido: true } } },
        },
      },
      orderBy: { estudiante: { usuario: { apellido: 'asc' } } },
    })
    return matriculas.map(m => ({
      estudiante_id: m.estudiante_id,
      nombre:        m.estudiante.usuario.nombre,
      apellido:      m.estudiante.usuario.apellido,
    }))
  }
}
