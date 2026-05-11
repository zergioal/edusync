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
  asignaciones: { select: { id: true } },
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
    await prisma.usuario.update({ where: { id: doc.usuario_id }, data })
    return this.findOne(id)
  }

  async deactivate(id: string) {
    const doc = await this.findOne(id)
    await prisma.usuario.update({ where: { id: doc.usuario_id }, data: { activo: false } })
  }
}
