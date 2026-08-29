import { prisma } from '@edusync/database'
import type { CategoriaObservacion } from '@edusync/database'
import { AppError } from '../middlewares/errorHandler'
import { crearNotificacion } from './comunicacion.service'

const CATEGORIA_LABEL: Record<CategoriaObservacion, string> = {
  NO_ENTREGO_TAREA:     'No entregó tarea',
  FALTO:                'Faltó a clase',
  SALIO_SIN_PERMISO:    'Salió de la clase sin permiso',
  NO_RINDIO_EVALUACION: 'No rindió evaluación',
  CITACION_AGENDA:      'Citación enviada en agenda',
  INDISCIPLINA:         'Indisciplina',
  OTRO:                 'Observación',
}

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

function hoyStr(): string {
  return new Date().toISOString().slice(0, 10)
}

export class ObservacionesDiariasService {

  /** Verifica que el docente tenga acceso de escritura al paralelo (asignación activa o asesoría) y devuelve la gestión a usar. */
  private async verificarAcceso(docente_id: string, paralelo_id: string): Promise<string> {
    const asignacion = await prisma.asignacion.findFirst({
      where: { docente_id, paralelo_id, gestion: { activa: true } },
    })
    if (asignacion) return asignacion.gestion_id

    const paralelo = await prisma.paralelo.findUnique({ where: { id: paralelo_id }, select: { asesor_id: true } })
    if (paralelo?.asesor_id === docente_id) {
      const gestionActiva = await prisma.gestion.findFirst({ where: { activa: true } })
      if (gestionActiva) return gestionActiva.id
    }

    throw new AppError(403, 'No tienes acceso a este curso', 'FORBIDDEN')
  }

  private async getDocente(usuario_id: string) {
    const docente = await prisma.docente.findUnique({ where: { usuario_id } })
    if (!docente) throw new AppError(404, 'Perfil de docente no encontrado', 'NOT_FOUND')
    return docente
  }

  async roster(docente_usuario_id: string, paralelo_id: string) {
    const docente = await this.getDocente(docente_usuario_id)
    const gestion_id = await this.verificarAcceso(docente.id, paralelo_id)

    const [matriculas, hoy] = await Promise.all([
      prisma.matricula.findMany({
        where:   { paralelo_id, gestion_id, estudiante: { estado: 'ACTIVO' } },
        include: { estudiante: { include: { usuario: { select: { nombre: true, apellido: true } } } } },
        orderBy: { estudiante: { usuario: { apellido: 'asc' } } },
      }),
      prisma.observacionDiaria.findMany({
        where:  { paralelo_id, fecha: new Date(hoyStr()) },
        select: { id: true, estudiante_id: true, categoria: true, detalle: true, creada_en: true },
      }),
    ])

    return {
      estudiantes: matriculas.map(m => ({
        estudiante_id: m.estudiante_id,
        nombre:        m.estudiante.usuario.nombre,
        apellido:      m.estudiante.usuario.apellido,
      })),
      hoy,
    }
  }

  async crear(docente_usuario_id: string, data: {
    estudiante_id: string
    paralelo_id:   string
    asignacion_id?: string
    categoria:     CategoriaObservacion
    detalle?:      string
  }) {
    const docente = await this.getDocente(docente_usuario_id)
    await this.verificarAcceso(docente.id, data.paralelo_id)

    if (data.asignacion_id) {
      const asignacion = await prisma.asignacion.findUnique({ where: { id: data.asignacion_id } })
      if (!asignacion || asignacion.docente_id !== docente.id || asignacion.paralelo_id !== data.paralelo_id) {
        throw new AppError(403, 'Asignación inválida para este curso', 'FORBIDDEN')
      }
    }

    if (data.categoria !== 'OTRO') {
      const repetida = await prisma.observacionDiaria.findFirst({
        where: { estudiante_id: data.estudiante_id, categoria: data.categoria, fecha: new Date(hoyStr()) },
      })
      if (repetida) {
        throw new AppError(409, `Ya se registró "${CATEGORIA_LABEL[data.categoria]}" hoy para este estudiante`, 'DUPLICATE')
      }
    }

    const observacion = await prisma.observacionDiaria.create({
      data: {
        estudiante_id: data.estudiante_id,
        docente_id:    docente.id,
        paralelo_id:   data.paralelo_id,
        asignacion_id: data.asignacion_id ?? null,
        categoria:     data.categoria,
        detalle:       data.detalle?.trim() || null,
        fecha:         new Date(hoyStr()),
      },
    })

    const estudiante = await prisma.estudiante.findUnique({
      where:   { id: data.estudiante_id },
      include: { usuario: { select: { id: true } }, relaciones_padre: { select: { padre_id: true } } },
    })
    if (estudiante) {
      const destinatarios = [estudiante.usuario.id, ...estudiante.relaciones_padre.map(r => r.padre_id)]
      await Promise.all(destinatarios.map(usuario_id => crearNotificacion({
        usuario_id,
        tipo:            'OBSERVACION',
        titulo:          'Nueva observación en Control Diario',
        cuerpo:          CATEGORIA_LABEL[data.categoria],
        referencia_id:   observacion.id,
        referencia_tipo: 'OBSERVACION_DIARIA',
      }).catch(() => {})))
    }

    return observacion
  }

  async eliminar(id: string, docente_usuario_id: string) {
    const docente = await this.getDocente(docente_usuario_id)
    const obs = await prisma.observacionDiaria.findUnique({ where: { id } })
    if (!obs || obs.docente_id !== docente.id) {
      throw new AppError(404, 'Observación no encontrada', 'NOT_FOUND')
    }
    if (obs.fecha.toISOString().slice(0, 10) !== hoyStr()) {
      throw new AppError(403, 'Solo puedes eliminar observaciones del día', 'FORBIDDEN')
    }
    await prisma.observacionDiaria.delete({ where: { id } })
  }

  private async listar(estudiante_id: string) {
    return prisma.observacionDiaria.findMany({
      where:   { estudiante_id },
      include: {
        docente:    { include: { usuario: { select: { nombre: true, apellido: true } } } },
        paralelo:   { select: { letra: true, grado: { select: { nombre: true } } } },
        asignacion: { select: { materia: { select: { nombre: true } } } },
      },
      orderBy: [{ fecha: 'desc' }, { creada_en: 'desc' }],
    })
  }

  async getMia(usuario_id: string) {
    const estudiante = await prisma.estudiante.findFirst({ where: { usuario_id } })
    if (!estudiante) throw new AppError(404, 'Perfil de estudiante no encontrado', 'NOT_FOUND')
    return this.listar(estudiante.id)
  }

  async getHijo(padre_usuario_id: string, estudiante_id: string) {
    const rel = await prisma.relacionPadreHijo.findFirst({ where: { padre_id: padre_usuario_id, estudiante_id } })
    if (!rel) throw new AppError(403, 'Sin acceso', 'FORBIDDEN')
    return this.listar(estudiante_id)
  }

  /** Registro de observaciones de un curso en un período (mes / trimestre / gestión completa), para Director/Coordinador. */
  async reporte(paralelo_id: string, institucion_id: string, filtro: {
    modo:          'mes' | 'trimestre' | 'anno'
    mes?:          string
    trimestre_id?: string
    gestion_id?:   string
  }) {
    const paralelo = await prisma.paralelo.findFirst({
      where:  { id: paralelo_id, grado: { nivel: { institucion_id } } },
      select: { letra: true, grado: { select: { nombre: true, nivel: { select: { nombre: true } } } } },
    })
    if (!paralelo) throw new AppError(404, 'Curso no encontrado', 'NOT_FOUND')

    let desde: Date, hasta: Date, periodo: string

    if (filtro.modo === 'mes') {
      if (!filtro.mes) throw new AppError(400, 'mes es requerido', 'MISSING_PARAM')
      const [y, m] = filtro.mes.split('-').map(Number)
      if (!y || !m) throw new AppError(400, 'mes inválido', 'INVALID_PARAM')
      desde   = new Date(Date.UTC(y, m - 1, 1))
      hasta   = new Date(Date.UTC(y, m, 0))
      periodo = `${MESES[m - 1]} ${y}`
    } else if (filtro.modo === 'trimestre') {
      if (!filtro.trimestre_id) throw new AppError(400, 'trimestre_id es requerido', 'MISSING_PARAM')
      const trimestre = await prisma.trimestre.findUnique({ where: { id: filtro.trimestre_id } })
      if (!trimestre) throw new AppError(404, 'Trimestre no encontrado', 'NOT_FOUND')
      desde   = trimestre.fecha_inicio
      hasta   = trimestre.fecha_fin
      periodo = `${trimestre.numero}° Trimestre`
    } else {
      if (!filtro.gestion_id) throw new AppError(400, 'gestion_id es requerido', 'MISSING_PARAM')
      const gestion = await prisma.gestion.findUnique({ where: { id: filtro.gestion_id } })
      if (!gestion) throw new AppError(404, 'Gestión no encontrada', 'NOT_FOUND')
      desde   = new Date(Date.UTC(gestion.anno, 0, 1))
      hasta   = new Date(Date.UTC(gestion.anno, 11, 31))
      periodo = `Gestión ${gestion.anno}`
    }

    const observaciones = await prisma.observacionDiaria.findMany({
      where:   { paralelo_id, fecha: { gte: desde, lte: hasta } },
      include: {
        estudiante: { include: { usuario: { select: { nombre: true, apellido: true } } } },
        docente:    { include: { usuario: { select: { nombre: true, apellido: true } } } },
        asignacion: { select: { materia: { select: { nombre: true } } } },
      },
      orderBy: [{ fecha: 'asc' }, { estudiante: { usuario: { apellido: 'asc' } } }],
    })

    return {
      curso:   `${paralelo.grado.nombre} "${paralelo.letra}" — ${paralelo.grado.nivel.nombre}`,
      periodo,
      observaciones: observaciones.map(o => ({
        fecha:      o.fecha.toISOString().slice(0, 10),
        estudiante: `${o.estudiante.usuario.apellido}, ${o.estudiante.usuario.nombre}`,
        categoria:  CATEGORIA_LABEL[o.categoria],
        detalle:    o.detalle,
        materia:    o.asignacion?.materia.nombre ?? '—',
        docente:    `${o.docente.usuario.nombre} ${o.docente.usuario.apellido}`,
      })),
    }
  }
}
