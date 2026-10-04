import { prisma } from '@edusync/database'
import type { Rol } from '@edusync/types'
import { AppError } from '../middlewares/errorHandler'
import { getSupabaseAdmin } from '../lib/supabase'

const BUCKET_FOTOS = 'avatares'
const TIPOS_FOTO_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp']

/** Crea el bucket la primera vez que se necesita — no hay que configurarlo a mano en Supabase. */
async function asegurarBucketFotos(): Promise<void> {
  const { error } = await getSupabaseAdmin().storage.createBucket(BUCKET_FOTOS, {
    public: true,
    fileSizeLimit: '3MB',
  })
  // "already exists" es el camino normal en cualquier llamada que no sea la primera — se ignora.
  if (error && !/already exists/i.test(error.message)) {
    throw new AppError(500, `No se pudo preparar el almacenamiento de fotos: ${error.message}`, 'STORAGE_ERROR')
  }
}

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

  async update(id: string, data: Partial<{ nombre: string; apellido: string; activo: boolean; grado_academico: string | null; foto_url: string | null }>) {
    await this.findOne(id)
    return prisma.usuario.update({ where: { id }, data })
  }

  /** Sube/reemplaza la foto de perfil del propio usuario. Un solo archivo por usuario
   *  (mismo nombre de siempre, "upsert") — evita ir acumulando fotos viejas huérfanas. */
  async subirFoto(usuario_id: string, buffer: Buffer, mimetype: string) {
    if (!TIPOS_FOTO_PERMITIDOS.includes(mimetype)) {
      throw new AppError(400, 'Solo se aceptan imágenes JPG, PNG o WEBP', 'VALIDATION_ERROR')
    }
    await this.findOne(usuario_id)
    await asegurarBucketFotos()

    const { error: uploadError } = await getSupabaseAdmin().storage
      .from(BUCKET_FOTOS)
      .upload(usuario_id, buffer, { contentType: mimetype, upsert: true })
    if (uploadError) throw new AppError(500, `No se pudo subir la foto: ${uploadError.message}`, 'STORAGE_ERROR')

    const { data: pub } = getSupabaseAdmin().storage.from(BUCKET_FOTOS).getPublicUrl(usuario_id)
    // Cache-buster: el nombre de archivo no cambia al reemplazar la foto, así que sin esto
    // el navegador (o el CDN) podría seguir sirviendo la imagen anterior desde caché.
    const foto_url = `${pub.publicUrl}?v=${Date.now()}`

    return prisma.usuario.update({ where: { id: usuario_id }, data: { foto_url } })
  }

  async quitarFoto(usuario_id: string) {
    await this.findOne(usuario_id)
    await getSupabaseAdmin().storage.from(BUCKET_FOTOS).remove([usuario_id]).catch(() => {})
    return prisma.usuario.update({ where: { id: usuario_id }, data: { foto_url: null } })
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
