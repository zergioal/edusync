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

const PADRE_INCLUDE = {
  hijos_a_cargo: {
    include: {
      estudiante: {
        select: {
          id:     true,
          codigo: true,
          usuario: { select: { nombre: true, apellido: true } },
        },
      },
    },
  },
} as const

export class PadresService {
  findAll(institucion_id: string, filters: { buscar?: string; paralelo_id?: string } = {}) {
    const { buscar, paralelo_id } = filters
    return prisma.usuario.findMany({
      where: {
        institucion_id,
        rol:    'PADRE_TUTOR',
        activo: true,
        ...(buscar ? {
          OR: [
            { nombre:   { contains: buscar, mode: 'insensitive' } },
            { apellido: { contains: buscar, mode: 'insensitive' } },
            { email:    { contains: buscar, mode: 'insensitive' } },
          ],
        } : {}),
        ...(paralelo_id ? {
          hijos_a_cargo: {
            some: {
              estudiante: { matriculas: { some: { paralelo_id } } },
            },
          },
        } : {}),
      },
      include:  PADRE_INCLUDE,
      orderBy:  { apellido: 'asc' },
    })
  }

  async findOne(id: string) {
    const padre = await prisma.usuario.findUnique({
      where:   { id },
      include: PADRE_INCLUDE,
    })
    if (!padre || padre.rol !== 'PADRE_TUTOR') throw new AppError(404, 'Padre/tutor no encontrado', 'NOT_FOUND')
    return padre
  }

  async create(institucion_id: string, data: { nombre: string; apellido: string; email: string }) {
    const existing = await prisma.usuario.findUnique({ where: { email: data.email } })
    if (existing) throw new AppError(409, 'Ya existe un usuario con ese correo', 'DUPLICATE_EMAIL')

    const password = `Padre2026#`
    const authId   = await createSupabaseUser(data.email, password)

    const padre = await prisma.usuario.create({
      data: {
        supabase_auth_id: authId,
        email:            data.email,
        nombre:           data.nombre,
        apellido:         data.apellido,
        rol:              'PADRE_TUTOR',
        institucion_id,
      },
      include: PADRE_INCLUDE,
    })
    return { padre, credentials: { email: data.email, password } }
  }

  async update(id: string, data: { nombre?: string; apellido?: string }) {
    await this.findOne(id)
    await prisma.usuario.update({ where: { id }, data })
    return this.findOne(id)
  }

  async remove(id: string) {
    const padre = await prisma.usuario.findUnique({
      where:  { id },
      select: { supabase_auth_id: true, rol: true },
    })
    if (!padre || padre.rol !== 'PADRE_TUTOR') throw new AppError(404, 'Padre/tutor no encontrado', 'NOT_FOUND')

    await prisma.usuario.delete({ where: { id } })
    getSupabaseAdmin().auth.admin.deleteUser(padre.supabase_auth_id).catch(() => {})
  }
}
