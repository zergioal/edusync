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

// ── Actividad de usuarios: última conexión + última acción por persona ──────
auditoriaRouter.get('/staff', canView, async (req, res, next) => {
  try {
    const institucion_id = req.auth!.institucion_id
    const rolParam = (req.query['rol'] as string | undefined) ?? ''

    // Sin filtro: personal (comportamiento histórico). 'TODOS': incluye también
    // estudiantes y padres/tutores. Un rol puntual: solo ese tipo de usuario.
    const rolWhere =
      rolParam === 'TODOS'
        ? {}
        : rolParam && (Object.values(Rol) as string[]).includes(rolParam)
          ? { rol: rolParam as Rol }
          : { rol: { in: [...STAFF_ROLES] } }

    const staff = await prisma.usuario.findMany({
      where:   { institucion_id, ...rolWhere },
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
    const { recurso, accion, rol, page = '1', limit = '50' } = req.query as Record<string, string>
    const take = Math.min(Number(limit), 100)
    const skip = (Number(page) - 1) * take

    let usuarioIdsFiltro: string[] | undefined
    if (rol && (Object.values(Rol) as string[]).includes(rol)) {
      const usuarios = await prisma.usuario.findMany({
        where:  { institucion_id: req.auth!.institucion_id ?? undefined, rol: rol as Rol },
        select: { id: true },
      })
      usuarioIdsFiltro = usuarios.map(u => u.id)
    }

    const data = await prisma.auditoriaLog.findMany({
      where: {
        ...(req.auth!.institucion_id ? { institucion_id: req.auth!.institucion_id } : {}),
        ...(recurso ? { recurso } : {}),
        ...(accion  ? { accion }  : {}),
        ...(usuarioIdsFiltro ? { usuario_id: { in: usuarioIdsFiltro } } : {}),
      },
      orderBy: { creado_en: 'desc' },
      take,
      skip,
    })

    // AuditoriaLog no tiene relación declarada a Usuario (usuario_id es un string
    // suelto), así que el nombre/rol de quien hizo la acción se resuelve aparte.
    const usuarioIds = [...new Set(data.map(d => d.usuario_id).filter((id): id is string => !!id))]
    const usuarios = usuarioIds.length > 0
      ? await prisma.usuario.findMany({
          where:  { id: { in: usuarioIds } },
          select: { id: true, nombre: true, apellido: true, rol: true },
        })
      : []
    const usuarioPorId = new Map(usuarios.map(u => [u.id, u]))

    const result = data.map(l => ({
      ...l,
      usuario: l.usuario_id ? usuarioPorId.get(l.usuario_id) ?? null : null,
    }))

    res.json({ data: result })
  } catch (e) { next(e) }
})
