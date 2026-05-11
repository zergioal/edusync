import type { Request, Response, NextFunction } from 'express'
import { InicialService } from '../services/inicial.service'
import { AppError } from '../middlewares/errorHandler'

export class InicialController {
  private service = new InicialService()

  getObservaciones = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const paralelo_id  = req.query['paralelo_id']  as string | undefined
      const trimestre_id = req.query['trimestre_id'] as string | undefined
      if (!paralelo_id)  throw new AppError(400, 'paralelo_id es requerido',  'VALIDATION')
      if (!trimestre_id) throw new AppError(400, 'trimestre_id es requerido', 'VALIDATION')
      res.json({ data: await this.service.getObservaciones(paralelo_id, trimestre_id) })
    } catch (e) { next(e) }
  }

  upsertObservaciones = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const entries = req.body as { estudiante_id: string; trimestre_id: string; contenido: string }[]
      if (!Array.isArray(entries)) throw new AppError(400, 'Se esperaba un array de observaciones', 'VALIDATION')
      await this.service.upsertObservaciones(req.auth!.usuario_id, entries)
      res.json({ data: null })
    } catch (e) { next(e) }
  }
}
