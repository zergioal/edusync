import { Router } from 'express'
import { prisma } from '@edusync/database'
import type { Rol } from '@edusync/types'

// Rutas de setup/diagnóstico — solo en desarrollo
export const setupRouter = Router()

if (process.env['NODE_ENV'] !== 'production') {

  // POST /api/v1/setup/upsert-user
  // Crea o actualiza un usuario en la tabla usuarios
  // Útil para vincular usuarios creados en Supabase Auth con la BD
  setupRouter.post('/upsert-user', async (req, res, next) => {
    try {
      const { email, supabase_uid, rol, nombre, apellido, institucion_id } =
        req.body as {
          email:          string
          supabase_uid:   string
          rol:            Rol
          nombre:         string
          apellido:       string
          institucion_id: string
        }

      if (!email || !supabase_uid || !rol) {
        res.status(400).json({ error: 'Se requieren email, supabase_uid y rol' })
        return
      }

      // Si no se proporciona institucion_id, usar la primera activa
      let instId = institucion_id
      if (!instId) {
        const inst = await prisma.institucion.findFirst({ where: { activa: true } })
        if (!inst) {
          res.status(400).json({ error: 'No hay institución activa. Proporciona institucion_id.' })
          return
        }
        instId = inst.id
      }

      const usuario = await prisma.usuario.upsert({
        where:  { email },
        create: {
          email,
          supabase_auth_id: supabase_uid,
          rol,
          nombre:           nombre ?? email.split('@')[0] ?? 'Usuario',
          apellido:         apellido ?? '',
          institucion_id:   instId,
          activo:           true,
        },
        update: { supabase_auth_id: supabase_uid, activo: true },
        select: { id: true, email: true, rol: true, nombre: true, apellido: true, supabase_auth_id: true },
      })

      // Si es DOCENTE, crear registro en docentes también
      if (rol === 'DOCENTE') {
        await prisma.docente.upsert({
          where:  { usuario_id: usuario.id },
          create: { usuario_id: usuario.id },
          update: {},
        })
      }

      res.json({ data: usuario })
    } catch (e) { next(e) }
  })

  // POST /api/v1/setup/link-user  (retrocompatible)
  setupRouter.post('/link-user', async (req, res, next) => {
    try {
      const { email, supabase_uid } = req.body as { email: string; supabase_uid: string }
      if (!email || !supabase_uid) {
        res.status(400).json({ error: 'Se requieren email y supabase_uid' })
        return
      }
      const usuario = await prisma.usuario.update({
        where:  { email },
        data:   { supabase_auth_id: supabase_uid },
        select: { id: true, email: true, rol: true, nombre: true, apellido: true },
      })
      res.json({ data: usuario, message: 'supabase_auth_id actualizado' })
    } catch (e) { next(e) }
  })

  // GET /api/v1/setup/check-user?email=xxx
  setupRouter.get('/check-user', async (req, res, next) => {
    try {
      const email = req.query['email'] as string
      if (!email) {
        res.status(400).json({ error: 'Se requiere email' })
        return
      }
      const usuario = await prisma.usuario.findUnique({
        where:  { email },
        select: { id: true, email: true, rol: true, supabase_auth_id: true, activo: true },
      })
      res.json({ data: usuario ?? null })
    } catch (e) { next(e) }
  })

  // GET /api/v1/setup/list-users  — lista todos los usuarios de la BD
  setupRouter.get('/list-users', async (_req, res, next) => {
    try {
      const usuarios = await prisma.usuario.findMany({
        select: { id: true, email: true, rol: true, supabase_auth_id: true, activo: true },
        orderBy: { rol: 'asc' },
      })
      res.json({ data: usuarios })
    } catch (e) { next(e) }
  })
}
