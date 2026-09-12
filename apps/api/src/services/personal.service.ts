import { prisma } from '@edusync/database'
import type { Rol } from '@edusync/types'
import { AppError } from '../middlewares/errorHandler'
import { getSupabaseAdmin } from '../lib/supabase'

/** Roles gestionables desde la pantalla de Gestión de Personal. Director,
 *  Secretaría, Contador, Regente y Coordinador — nunca Admin ni los roles
 *  con su propio flujo de alta (Docente, Estudiante, Padre/Tutor). */
const ROLES_PERSONAL = ['DIRECTOR', 'COORDINADOR', 'SECRETARIA', 'CONTADOR', 'REGENTE'] as const
type RolPersonal = (typeof ROLES_PERSONAL)[number]

const PASSWORD_POR_ROL: Record<RolPersonal, string> = {
  DIRECTOR:    'director2026',
  COORDINADOR: 'coordinador2026',
  SECRETARIA:  'secretaria2026',
  CONTADOR:    'contador2026',
  REGENTE:     'regente2026',
}

function esRolPersonal(rol: string): rol is RolPersonal {
  return (ROLES_PERSONAL as readonly string[]).includes(rol)
}

async function createSupabaseUser(email: string, password: string): Promise<string> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true })
  if (!error) return data.user.id

  const isEmailConflict = error.message.toLowerCase().includes('already registered')
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

const PERSONAL_SELECT = {
  id: true, email: true, rol: true, nombre: true, apellido: true, activo: true, created_at: true,
  alcance_niveles: { include: { nivel: { select: { id: true, nombre: true } } } },
} as const

/** Arma las filas de CoordinadorNivel a crear: si `es_bth` viene true, se
 *  asegura de incluir SECUNDARIA (aunque no la hayan marcado) y le pone el flag. */
async function buildAlcanceRows(institucion_id: string, nivel_ids: string[], es_bth: boolean) {
  const ids = new Set(nivel_ids)
  const secundariaId = es_bth
    ? (await prisma.nivel.findFirst({ where: { institucion_id, nombre: 'SECUNDARIA' } }))?.id
    : undefined
  if (secundariaId) ids.add(secundariaId)
  return [...ids].map(nivel_id => ({ nivel_id, es_bth: !!secundariaId && nivel_id === secundariaId }))
}

export class PersonalService {
  findAll(institucion_id: string) {
    return prisma.usuario.findMany({
      where:   { institucion_id, rol: { in: [...ROLES_PERSONAL] as Rol[] } },
      select:  PERSONAL_SELECT,
      orderBy: [{ rol: 'asc' }, { apellido: 'asc' }],
    })
  }

  async create(
    institucion_id: string,
    data: {
      nombre: string; apellido: string; email: string; rol: string
      nivel_ids?: string[] | undefined; es_bth?: boolean | undefined
    },
  ) {
    if (!esRolPersonal(data.rol)) {
      throw new AppError(400, `Rol inválido para personal: ${data.rol}`, 'VALIDATION_ERROR')
    }
    const existing = await prisma.usuario.findUnique({ where: { email: data.email } })
    if (existing) throw new AppError(409, 'Ya existe un usuario con ese correo', 'DUPLICATE_EMAIL')

    const password = PASSWORD_POR_ROL[data.rol]
    const authId = await createSupabaseUser(data.email, password)

    const usuario = await prisma.usuario.create({
      data: {
        supabase_auth_id: authId, email: data.email,
        nombre: data.nombre, apellido: data.apellido,
        rol: data.rol, institucion_id,
      },
    })

    if (data.rol === 'COORDINADOR' && (data.nivel_ids?.length || data.es_bth)) {
      const rows = await buildAlcanceRows(institucion_id, data.nivel_ids ?? [], !!data.es_bth)
      await prisma.coordinadorNivel.createMany({
        data: rows.map(r => ({ usuario_id: usuario.id, ...r })),
      })
    }

    const conAlcance = await prisma.usuario.findUniqueOrThrow({ where: { id: usuario.id }, select: PERSONAL_SELECT })
    return { usuario: conAlcance, password }
  }

  async update(
    id: string,
    data: {
      nombre?: string | undefined; apellido?: string | undefined; activo?: boolean | undefined
      nivel_ids?: string[] | undefined; es_bth?: boolean | undefined
    },
  ) {
    const usuario = await prisma.usuario.findUnique({ where: { id } })
    if (!usuario || !esRolPersonal(usuario.rol)) throw new AppError(404, 'Personal no encontrado', 'NOT_FOUND')

    const resto: { nombre?: string; apellido?: string; activo?: boolean } = {}
    if (data.nombre   !== undefined) resto.nombre   = data.nombre
    if (data.apellido !== undefined) resto.apellido = data.apellido
    if (data.activo   !== undefined) resto.activo   = data.activo
    if (Object.keys(resto).length > 0) {
      await prisma.usuario.update({ where: { id }, data: resto })
    }
    const { nivel_ids, es_bth } = data

    if (usuario.rol === 'COORDINADOR' && nivel_ids !== undefined) {
      const rows = await buildAlcanceRows(usuario.institucion_id, nivel_ids, !!es_bth)
      await prisma.$transaction([
        prisma.coordinadorNivel.deleteMany({ where: { usuario_id: id } }),
        ...(rows.length > 0
          ? [prisma.coordinadorNivel.createMany({ data: rows.map(r => ({ usuario_id: id, ...r })) })]
          : []),
      ])
    }

    return prisma.usuario.findUniqueOrThrow({ where: { id }, select: PERSONAL_SELECT })
  }

  async remove(id: string) {
    const usuario = await prisma.usuario.findUnique({ where: { id } })
    if (!usuario || !esRolPersonal(usuario.rol)) throw new AppError(404, 'Personal no encontrado', 'NOT_FOUND')

    await prisma.usuario.delete({ where: { id } }) // cascada: CoordinadorNivel
    getSupabaseAdmin().auth.admin.deleteUser(usuario.supabase_auth_id).catch(() => {})
  }
}
