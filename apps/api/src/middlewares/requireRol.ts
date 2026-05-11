import type { Request, Response, NextFunction } from 'express'
import type { Rol } from '@edusync/types'

export function requireRol(...roles: Rol[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userRol = req.auth?.rol

    if (!userRol || !roles.includes(userRol)) {
      res.status(403).json({
        error:   'Forbidden',
        message: `Acceso denegado. Roles permitidos: ${roles.join(', ')}`,
      })
      return
    }

    next()
  }
}
