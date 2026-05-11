import { prisma } from '@edusync/database'
import type { Rol } from '@edusync/types'
import { AppError } from '../middlewares/errorHandler'

export class UsuariosService {
  findAll(institucion_id: string, filters: { rol?: string; buscar?: string } = {}) {
    const { rol, buscar } = filters
    return prisma.usuario.findMany({
      where: {
        institucion_id,
        ...(rol ? { rol: rol as import('@edusync/types').Rol } : {}),
        ...(buscar ? {
          OR: [
            { apellido: { contains: buscar, mode: 'insensitive' } },
            { nombre:   { contains: buscar, mode: 'insensitive' } },
          ],
        } : {}),
      },
      orderBy: { apellido: 'asc' },
      select: { id: true, email: true, rol: true, nombre: true, apellido: true, activo: true, created_at: true },
    })
  }

  async findBySupabaseId(supabase_auth_id: string) {
    const user = await prisma.usuario.findUnique({ where: { supabase_auth_id } })
    if (!user) throw new AppError(404, 'Usuario no encontrado', 'NOT_FOUND')
    return user
  }

  async findOne(id: string) {
    const user = await prisma.usuario.findUnique({ where: { id } })
    if (!user) throw new AppError(404, 'Usuario no encontrado', 'NOT_FOUND')
    return user
  }

  create(
    institucion_id: string,
    data: { supabase_auth_id: string; email: string; rol: Rol; nombre: string; apellido: string }
  ) {
    return prisma.usuario.create({ data: { ...data, institucion_id } })
  }

  async update(id: string, data: Partial<{ nombre: string; apellido: string; activo: boolean }>) {
    await this.findOne(id)
    return prisma.usuario.update({ where: { id }, data })
  }

  async remove(id: string) {
    await this.findOne(id)
    return prisma.usuario.delete({ where: { id } })
  }
}
