import { prisma } from '@edusync/database'
import { AppError } from '../middlewares/errorHandler'
import { getSupabaseAdmin } from '../lib/supabase'

async function createSupabaseUser(email: string, password: string): Promise<string> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true })
  if (!error) return data.user.id

  const isEmailConflict = error.message.toLowerCase().includes('already been registered')
    || error.message.toLowerCase().includes('already registered')
  if (isEmailConflict) {
    const { data: listing } = await supabase.auth.admin.listUsers({ perPage: 1000, page: 1 })
    const orphan = listing?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase())
    if (orphan) {
      const existing = await prisma.usuario.findFirst({ where: { supabase_auth_id: orphan.id } })
      if (!existing) return orphan.id
    }
    throw new AppError(409, 'Ya existe un usuario con ese correo electrónico', 'DUPLICATE_EMAIL')
  }
  throw new AppError(422, `Error creando cuenta: ${error.message}`, 'AUTH_ERROR')
}

const DOC_INCLUDE = {
  usuario: { select: { id: true, nombre: true, apellido: true, email: true, activo: true } },
  asignaciones: {
    select: {
      id:      true,
      materia: {
        select: {
          nombre:          true,
          horas_semanales: true,
          carga_horaria:   { select: { grado_id: true, horas_mes: true } },
        },
      },
      paralelo: { select: { letra: true, grado: { select: { id: true, nombre: true } } } },
      gestion:  { select: { anno: true } },
    },
  },
} as const

export class DocentesService {
  findAll(institucion_id: string, filters: { buscar?: string } = {}) {
    const { buscar } = filters
    return prisma.docente.findMany({
      where: {
        usuario: {
          institucion_id,
          activo: true,
          ...(buscar ? {
            OR: [
              { nombre:   { contains: buscar, mode: 'insensitive' } },
              { apellido: { contains: buscar, mode: 'insensitive' } },
              { email:    { contains: buscar, mode: 'insensitive' } },
            ],
          } : {}),
        },
      },
      include: DOC_INCLUDE,
      orderBy: { usuario: { apellido: 'asc' } },
    })
  }

  async findOne(id: string) {
    const doc = await prisma.docente.findUnique({
      where:   { id },
      include: {
        usuario: { select: { id: true, nombre: true, apellido: true, email: true, activo: true } },
        asignaciones: {
          include: {
            materia:  { include: { campo: true, nivel: true } },
            paralelo: { include: { grado: { include: { nivel: true } } } },
            gestion:  true,
          },
          orderBy: [{ materia: { nombre: 'asc' } }],
        },
      },
    })
    if (!doc) throw new AppError(404, 'Docente no encontrado', 'NOT_FOUND')
    return doc
  }

  async create(institucion_id: string, data: { nombre: string; apellido: string; email: string }) {
    const existing = await prisma.usuario.findUnique({ where: { email: data.email } })
    if (existing) throw new AppError(409, 'Ya existe un usuario con ese correo', 'DUPLICATE_EMAIL')

    const password = `Docente2026#`
    const authId = await createSupabaseUser(data.email, password)

    const docente = await prisma.docente.create({
      data: {
        usuario: {
          create: {
            supabase_auth_id: authId,
            email:            data.email,
            nombre:           data.nombre,
            apellido:         data.apellido,
            rol:              'DOCENTE',
            institucion_id,
          },
        },
      },
      include: DOC_INCLUDE,
    })
    return { docente, credentials: { email: data.email, password } }
  }

  async update(id: string, data: { nombre?: string; apellido?: string; email?: string }) {
    const doc = await this.findOne(id)
    if (Object.keys(data).length === 0) return doc

    if (data.email && data.email !== doc.usuario.email) {
      const u = await prisma.usuario.findUnique({
        where: { id: doc.usuario_id }, select: { supabase_auth_id: true },
      })
      if (u?.supabase_auth_id) {
        getSupabaseAdmin().auth.admin
          .updateUserById(u.supabase_auth_id, { email: data.email })
          .catch(() => {})
      }
    }

    await prisma.usuario.update({ where: { id: doc.usuario_id }, data })
    return this.findOne(id)
  }

  async remove(id: string) {
    const doc = await prisma.docente.findUnique({
      where:  { id },
      select: {
        usuario_id:   true,
        usuario:      { select: { supabase_auth_id: true } },
        asignaciones: { select: { id: true } },
      },
    })
    if (!doc) throw new AppError(404, 'Docente no encontrado', 'NOT_FOUND')

    await prisma.$transaction(async (tx) => {
      // Cascade: notas → indicadores → asistencias/tareas → asignaciones → observaciones → docente/usuario
      for (const asig of doc.asignaciones) {
        const indicadores = await tx.indicador.findMany({
          where:  { asignacion_id: asig.id },
          select: { id: true },
        })
        if (indicadores.length > 0) {
          await tx.notaIndicador.deleteMany({ where: { indicador_id: { in: indicadores.map(i => i.id) } } })
          await tx.indicador.deleteMany({ where: { asignacion_id: asig.id } })
        }
        await tx.asistenciaClase.deleteMany({ where: { asignacion_id: asig.id } })
        await tx.tarea.deleteMany({ where: { asignacion_id: asig.id } })
        await tx.asignacion.delete({ where: { id: asig.id } })
      }
      await tx.observacionInicial.deleteMany({ where: { docente_id: id } })
      await tx.horario.deleteMany({ where: { docente_id: id } })
      await tx.usuario.delete({ where: { id: doc.usuario_id } })
    })

    getSupabaseAdmin().auth.admin.deleteUser(doc.usuario.supabase_auth_id).catch(() => {})
  }
}
