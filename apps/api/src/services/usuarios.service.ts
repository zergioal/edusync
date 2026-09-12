import { prisma } from '@edusync/database'
import type { Rol } from '@edusync/types'
import { AppError } from '../middlewares/errorHandler'
import { getSupabaseAdmin } from '../lib/supabase'

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

    if (user.rol === 'COORDINADOR') {
      const alcance = await prisma.coordinadorNivel.findMany({
        where:   { usuario_id: user.id },
        include: { nivel: { select: { nombre: true } } },
      })
      return {
        ...user,
        alcance_niveles: alcance.map(a => a.nivel.nombre),
        acceso_bth: alcance.length === 0 || alcance.some(a => a.es_bth),
      }
    }
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

  async update(id: string, data: Partial<{ nombre: string; apellido: string; activo: boolean; grado_academico: string | null }>) {
    await this.findOne(id)
    return prisma.usuario.update({ where: { id }, data })
  }

  async remove(id: string) {
    await this.findOne(id)
    return prisma.usuario.delete({ where: { id } })
  }

  async resetPassword(id: string, newPassword: string, actorRol: Rol) {
    const usuario = await this.findOne(id)
    const esPersonal = ['DIRECTOR', 'COORDINADOR', 'SECRETARIA', 'CONTADOR', 'REGENTE'].includes(usuario.rol)

    if (esPersonal) {
      if (actorRol !== 'ADMIN_SISTEMA' && actorRol !== 'DIRECTOR') {
        throw new AppError(403, 'Solo Administrador o Director pueden restablecer la contraseña de personal', 'FORBIDDEN')
      }
    } else if (usuario.rol !== 'ESTUDIANTE' && usuario.rol !== 'PADRE_TUTOR') {
      throw new AppError(403, 'Solo se puede restablecer la contraseña de estudiantes, padres/tutores o personal', 'FORBIDDEN')
    }

    const { error } = await getSupabaseAdmin().auth.admin.updateUserById(usuario.supabase_auth_id, { password: newPassword })
    if (error) throw new AppError(500, `No se pudo restablecer la contraseña: ${error.message}`, 'SUPABASE_ERROR')
    return { ok: true }
  }
}
