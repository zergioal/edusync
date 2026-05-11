import type { Request, Response } from 'express'

export function notFound(req: Request, res: Response): void {
  res.status(404).json({
    error:   'Not Found',
    message: `Ruta no encontrada: ${req.method} ${req.path}`,
  })
}
