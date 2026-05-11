import type { Request, Response, NextFunction } from 'express'
import type { Rol } from '@edusync/types'
import { getSupabaseAdmin } from '../lib/supabase'
import { prisma } from '@edusync/database'

// ─── Augment Express Request ─────────────────────────────────────────────────

export interface AuthContext {
  supabase_uid:   string
  email:          string
  institucion_id: string
  rol:            Rol
  usuario_id:     string
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext
    }
  }
}

// ─── Middleware ───────────────────────────────────────────────────────────────

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const header = req.headers.authorization

    if (!header?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized', message: 'Token requerido' })
      return
    }

    const token = header.slice(7)

    // 1. Verificar token contra Supabase (no requiere JWT_SECRET local)
    const { data: { user: supabaseUser }, error } = await getSupabaseAdmin().auth.getUser(token)

    if (error || !supabaseUser) {
      res.status(401).json({ error: 'Unauthorized', message: 'Token inválido o expirado' })
      return
    }

    // 2. Buscar el usuario en nuestra BD usando el supabase_auth_id
    const usuario = await prisma.usuario.findUnique({
      where:  { supabase_auth_id: supabaseUser.id },
      select: { id: true, rol: true, institucion_id: true, activo: true },
    })

    if (!usuario) {
      res.status(401).json({
        error:   'Unauthorized',
        message: 'Usuario autenticado pero no registrado en el sistema. Contacta al administrador.',
      })
      return
    }

    if (!usuario.activo) {
      res.status(403).json({
        error:   'Forbidden',
        message: 'Tu cuenta está desactivada. Contacta al administrador.',
      })
      return
    }

    req.auth = {
      supabase_uid:   supabaseUser.id,
      email:          supabaseUser.email ?? '',
      institucion_id: usuario.institucion_id,
      rol:            usuario.rol as Rol,
      usuario_id:     usuario.id,
    }

    next()
  } catch (err) {
    // Cualquier error inesperado (BD caída, etc.) se pasa al errorHandler
    // En lugar de crashear el proceso con unhandled rejection
    next(err)
  }
}
