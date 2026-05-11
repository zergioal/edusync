import { prisma } from '@edusync/database'
import type { TipoNotificacion, VisiblePara } from '@edusync/database'
import { AppError } from '../middlewares/errorHandler'

// ─── Helpers internos ─────────────────────────────────────────────────────────

export async function crearNotificacion(opts: {
  usuario_id: string
  tipo: TipoNotificacion
  titulo: string
  cuerpo: string
  referencia_id?: string
  referencia_tipo?: string
  tarea_id?: string
}) {
  return prisma.notificacion.create({ data: opts })
}

async function notificarMasivo(usuario_ids: string[], opts: Omit<Parameters<typeof crearNotificacion>[0], 'usuario_id'>) {
  await prisma.notificacion.createMany({
    data: usuario_ids.map(id => ({ ...opts, usuario_id: id })),
  })
}

// ─── Anuncios ────────────────────────────────────────────────────────────────

export class AnunciosService {
  async create(
    institucion_id: string,
    autor_id: string,
    data: {
      titulo: string
      contenido: string
      visible_para?: VisiblePara
      paralelo_id?: string
      destacado?: boolean
    },
  ) {
    const anuncio = await prisma.anuncio.create({
      data: {
        institucion_id,
        autor_id,
        titulo:       data.titulo,
        contenido:    data.contenido,
        visible_para: data.visible_para ?? 'TODOS',
        paralelo_id:  data.paralelo_id ?? null,
        destacado:    data.destacado ?? false,
      },
      include: { autor: { select: { nombre: true, apellido: true, rol: true } } },
    })

    // Notificar destinatarios
    await this.notificarAnuncio(anuncio.id, anuncio.titulo, data.visible_para ?? 'TODOS', institucion_id)

    return anuncio
  }

  private async notificarAnuncio(anuncio_id: string, titulo: string, visiblePara: VisiblePara, institucion_id: string) {
    let whereRol: Record<string, unknown> = {}
    if (visiblePara === 'DOCENTES')     whereRol = { rol: 'DOCENTE' }
    if (visiblePara === 'ESTUDIANTES')  whereRol = { rol: 'ESTUDIANTE' }
    if (visiblePara === 'PPFF')         whereRol = { rol: 'PADRE_TUTOR' }
    if (visiblePara === 'INTERNOS')     whereRol = { rol: { in: ['DIRECTOR', 'COORDINADOR', 'SECRETARIA', 'REGENTE', 'CONTADOR', 'DOCENTE'] } }

    const usuarios = await prisma.usuario.findMany({
      where: { institucion_id, activo: true, ...whereRol },
      select: { id: true },
    })

    if (usuarios.length === 0) return

    await notificarMasivo(
      usuarios.map(u => u.id),
      {
        tipo:           'ANUNCIO',
        titulo:         'Nuevo anuncio',
        cuerpo:         titulo,
        referencia_id:  anuncio_id,
        referencia_tipo: 'ANUNCIO',
      },
    )
  }

  async findAll(institucion_id: string, opts: {
    visible_para?: string
    paralelo_id?: string
    activo?: boolean
  } = {}) {
    return prisma.anuncio.findMany({
      where: {
        institucion_id,
        activo:       opts.activo !== undefined ? opts.activo : true,
        ...(opts.visible_para ? { visible_para: opts.visible_para as VisiblePara } : {}),
        ...(opts.paralelo_id  ? { paralelo_id: opts.paralelo_id }                 : {}),
      },
      include: {
        autor:    { select: { nombre: true, apellido: true, rol: true } },
        paralelo: { select: { letra: true, grado: { select: { nombre: true } } } },
      },
      orderBy: [{ destacado: 'desc' }, { publicado_en: 'desc' }],
    })
  }

  async update(id: string, institucion_id: string, data: {
    titulo?: string
    contenido?: string
    visible_para?: VisiblePara
    destacado?: boolean
    activo?: boolean
  }) {
    const anuncio = await prisma.anuncio.findUnique({ where: { id } })
    if (!anuncio || anuncio.institucion_id !== institucion_id) {
      throw new AppError(404, 'Anuncio no encontrado', 'NOT_FOUND')
    }
    return prisma.anuncio.update({ where: { id }, data })
  }

  async remove(id: string, institucion_id: string) {
    const anuncio = await prisma.anuncio.findUnique({ where: { id } })
    if (!anuncio || anuncio.institucion_id !== institucion_id) {
      throw new AppError(404, 'Anuncio no encontrado', 'NOT_FOUND')
    }
    await prisma.anuncio.update({ where: { id }, data: { activo: false } })
  }
}

// ─── Tareas ───────────────────────────────────────────────────────────────────

export class TareasService {
  async create(
    docente_usuario_id: string,
    data: { asignacion_id: string; titulo: string; descripcion?: string; fecha_entrega: string },
  ) {
    const asignacion = await prisma.asignacion.findUnique({
      where:   { id: data.asignacion_id },
      include: {
        docente:  { select: { usuario_id: true } },
        paralelo: { include: { matriculas: { include: { estudiante: { include: { usuario: { select: { id: true } } } } } } } },
        materia:  { select: { nombre: true } },
      },
    })
    if (!asignacion) throw new AppError(404, 'Asignación no encontrada', 'NOT_FOUND')
    if (asignacion.docente.usuario_id !== docente_usuario_id) {
      throw new AppError(403, 'Solo el docente de la asignación puede publicar tareas', 'FORBIDDEN')
    }

    const tarea = await prisma.tarea.create({
      data: {
        asignacion_id: data.asignacion_id,
        titulo:        data.titulo,
        descripcion:   data.descripcion ?? null,
        fecha_entrega: new Date(data.fecha_entrega),
      },
    })

    // Notificar a los estudiantes del paralelo
    const estudianteIds = asignacion.paralelo.matriculas.map(m => m.estudiante.usuario.id)
    if (estudianteIds.length > 0) {
      await notificarMasivo(estudianteIds, {
        tipo:            'TAREA',
        titulo:          `Nueva tarea: ${asignacion.materia.nombre}`,
        cuerpo:          data.titulo,
        referencia_id:   tarea.id,
        referencia_tipo: 'TAREA',
        tarea_id:        tarea.id,
      })
    }

    return tarea
  }

  async findByDocente(docente_usuario_id: string, opts: { asignacion_id?: string } = {}) {
    const docente = await prisma.docente.findFirst({ where: { usuario_id: docente_usuario_id } })
    if (!docente) throw new AppError(404, 'Perfil docente no encontrado', 'NOT_FOUND')

    return prisma.tarea.findMany({
      where: {
        activo:     true,
        asignacion: {
          docente_id:                 docente.id,
          ...(opts.asignacion_id ? { id: opts.asignacion_id } : {}),
        },
      },
      include: { asignacion: { include: { materia: { select: { nombre: true } }, paralelo: { select: { letra: true, grado: { select: { nombre: true } } } } } } },
      orderBy: { fecha_entrega: 'asc' },
    })
  }

  async findByEstudiante(usuario_id: string) {
    const estudiante = await prisma.estudiante.findFirst({
      where:   { usuario_id },
      include: { matriculas: { orderBy: { gestion: { anno: 'desc' } }, take: 1 } },
    })
    if (!estudiante) throw new AppError(404, 'Perfil estudiante no encontrado', 'NOT_FOUND')
    if (estudiante.matriculas.length === 0) return []

    const paralelo_id = estudiante.matriculas[0]!.paralelo_id

    return prisma.tarea.findMany({
      where: {
        activo:     true,
        asignacion: { paralelo_id },
      },
      include: { asignacion: { include: { materia: { select: { nombre: true } } } } },
      orderBy: { fecha_entrega: 'asc' },
    })
  }

  async update(id: string, docente_usuario_id: string, data: {
    titulo?: string; descripcion?: string; fecha_entrega?: string; activo?: boolean
  }) {
    const tarea = await prisma.tarea.findUnique({
      where:   { id },
      include: { asignacion: { include: { docente: { select: { usuario_id: true } } } } },
    })
    if (!tarea) throw new AppError(404, 'Tarea no encontrada', 'NOT_FOUND')
    if (tarea.asignacion.docente.usuario_id !== docente_usuario_id) {
      throw new AppError(403, 'Solo el docente puede modificar esta tarea', 'FORBIDDEN')
    }
    return prisma.tarea.update({
      where: { id },
      data:  { ...data, ...(data.fecha_entrega ? { fecha_entrega: new Date(data.fecha_entrega) } : {}) },
    })
  }

  async remove(id: string, docente_usuario_id: string) {
    await this.update(id, docente_usuario_id, { activo: false })
  }
}

// ─── Mensajes ─────────────────────────────────────────────────────────────────

export class MensajesService {
  async create(remitente_id: string, data: { destinatario_id: string; asunto: string; cuerpo: string }) {
    const [remitente, destinatario] = await Promise.all([
      prisma.usuario.findUnique({ where: { id: remitente_id } }),
      prisma.usuario.findUnique({ where: { id: data.destinatario_id } }),
    ])
    if (!destinatario) throw new AppError(404, 'Destinatario no encontrado', 'NOT_FOUND')

    const mensaje = await prisma.mensaje.create({
      data: { remitente_id, destinatario_id: data.destinatario_id, asunto: data.asunto, cuerpo: data.cuerpo },
    })

    // Notificar al destinatario
    await crearNotificacion({
      usuario_id:      data.destinatario_id,
      tipo:            'GENERAL',
      titulo:          `Mensaje de ${remitente?.nombre} ${remitente?.apellido}`,
      cuerpo:          data.asunto,
      referencia_id:   mensaje.id,
      referencia_tipo: 'MENSAJE',
    })

    return mensaje
  }

  async getBandeja(usuario_id: string) {
    const [recibidos, enviados] = await Promise.all([
      prisma.mensaje.findMany({
        where:   { destinatario_id: usuario_id },
        include: { remitente: { select: { nombre: true, apellido: true, rol: true } } },
        orderBy: { enviado_en: 'desc' },
      }),
      prisma.mensaje.findMany({
        where:   { remitente_id: usuario_id },
        include: { destinatario: { select: { nombre: true, apellido: true, rol: true } } },
        orderBy: { enviado_en: 'desc' },
      }),
    ])
    return { recibidos, enviados }
  }

  async getOne(id: string, usuario_id: string) {
    const mensaje = await prisma.mensaje.findUnique({
      where:   { id },
      include: {
        remitente:    { select: { nombre: true, apellido: true, rol: true } },
        destinatario: { select: { nombre: true, apellido: true, rol: true } },
      },
    })
    if (!mensaje) throw new AppError(404, 'Mensaje no encontrado', 'NOT_FOUND')
    if (mensaje.remitente_id !== usuario_id && mensaje.destinatario_id !== usuario_id) {
      throw new AppError(403, 'Sin acceso a este mensaje', 'FORBIDDEN')
    }
    if (mensaje.destinatario_id === usuario_id && !mensaje.leido) {
      await prisma.mensaje.update({ where: { id }, data: { leido: true } })
    }
    return mensaje
  }
}

// ─── Notificaciones ──────────────────────────────────────────────────────────

export class NotificacionesService {
  async findAll(usuario_id: string, opts: { solo_no_leidas?: boolean; page?: number } = {}) {
    const take = 30
    const skip = ((opts.page ?? 1) - 1) * take

    const [items, total] = await Promise.all([
      prisma.notificacion.findMany({
        where:   { usuario_id, ...(opts.solo_no_leidas ? { leida: false } : {}) },
        orderBy: { creada_en: 'desc' },
        take,
        skip,
      }),
      prisma.notificacion.count({
        where: { usuario_id, ...(opts.solo_no_leidas ? { leida: false } : {}) },
      }),
    ])
    return { items, total, no_leidas: await prisma.notificacion.count({ where: { usuario_id, leida: false } }) }
  }

  async marcarLeida(id: string, usuario_id: string) {
    const n = await prisma.notificacion.findUnique({ where: { id } })
    if (!n || n.usuario_id !== usuario_id) throw new AppError(404, 'Notificación no encontrada', 'NOT_FOUND')
    return prisma.notificacion.update({ where: { id }, data: { leida: true } })
  }

  async marcarTodasLeidas(usuario_id: string) {
    await prisma.notificacion.updateMany({ where: { usuario_id, leida: false }, data: { leida: true } })
  }

  async contarNoLeidas(usuario_id: string) {
    return prisma.notificacion.count({ where: { usuario_id, leida: false } })
  }
}
