import { Router } from 'express'
import { requireRol } from '../middlewares/requireRol'
import { Rol } from '@edusync/types'
import { prisma } from '@edusync/database'
import { getSupabaseAdmin } from '../lib/supabase'

export const auditoriaRouter = Router()

const canView = requireRol(Rol.DIRECTOR, Rol.ADMIN_SISTEMA)

const STAFF_ROLES = [
  Rol.DOCENTE, Rol.DIRECTOR, Rol.COORDINADOR, Rol.SECRETARIA,
  Rol.REGENTE, Rol.CONTADOR, Rol.ADMIN_SISTEMA,
] as const

// ── Actividad de staff: última conexión + última acción por persona ─────────
auditoriaRouter.get('/staff', canView, async (req, res, next) => {
  try {
    const institucion_id = req.auth!.institucion_id

    const staff = await prisma.usuario.findMany({
      where:   { institucion_id, rol: { in: [...STAFF_ROLES] } },
      select:  { id: true, nombre: true, apellido: true, rol: true, activo: true, supabase_auth_id: true },
      orderBy: [{ apellido: 'asc' }, { nombre: 'asc' }],
    })

    const staffIds = staff.map(s => s.id)

    const ultimasAcciones = staffIds.length > 0
      ? await prisma.auditoriaLog.findMany({
          where:    { institucion_id, usuario_id: { in: staffIds } },
          distinct: ['usuario_id'],
          orderBy:  { creado_en: 'desc' },
          select:   { usuario_id: true, recurso: true, accion: true, creado_en: true },
        })
      : []
    const accionPorUsuario = new Map(ultimasAcciones.map(a => [a.usuario_id, a]))

    let conexionPorAuthId = new Map<string, string | null>()
    try {
      const { data } = await getSupabaseAdmin().auth.admin.listUsers({ perPage: 1000, page: 1 })
      conexionPorAuthId = new Map(data.users.map(u => [u.id, u.last_sign_in_at ?? null]))
    } catch { /* si falla Supabase Auth, se devuelve sin última conexión */ }

    const result = staff.map(s => ({
      id:              s.id,
      nombre:          s.nombre,
      apellido:        s.apellido,
      rol:             s.rol,
      activo:          s.activo,
      ultima_conexion: conexionPorAuthId.get(s.supabase_auth_id) ?? null,
      ultima_accion:   accionPorUsuario.get(s.id) ?? null,
    }))

    res.json({ data: result })
  } catch (e) { next(e) }
})

auditoriaRouter.get('/', canView, async (req, res, next) => {
  try {
    const { recurso, accion, page = '1', limit = '50' } = req.query as Record<string, string>
    const take = Math.min(Number(limit), 100)
    const skip = (Number(page) - 1) * take

    const data = await prisma.auditoriaLog.findMany({
      where: {
        ...(req.auth!.institucion_id ? { institucion_id: req.auth!.institucion_id } : {}),
        ...(recurso ? { recurso } : {}),
        ...(accion  ? { accion }  : {}),
      },
      orderBy: { creado_en: 'desc' },
      take,
      skip,
    })

    res.json({ data })
  } catch (e) { next(e) }
})
