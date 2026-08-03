import type { Request, Response, NextFunction } from 'express'
import { PlanillaService } from '../services/planilla.service'
import { AppError } from '../middlewares/errorHandler'

export class PlanillaController {
  private service = new PlanillaService()

  get = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const trimestre_id = req.query['trimestre_id'] as string | undefined
      res.json({ data: await this.service.get(req.params['asignacion_id']!, trimestre_id) })
    } catch (e) { next(e) }
  }

  getMia = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { trimestre_id } = req.query as Record<string, string>
      if (!trimestre_id) throw new AppError(400, 'trimestre_id es requerido', 'MISSING_PARAM')
      res.json({ data: await this.service.getMia(req.auth!.usuario_id, trimestre_id, req.auth!.institucion_id) })
    } catch (e) { next(e) }
  }

  getHijo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { trimestre_id } = req.query as Record<string, string>
      if (!trimestre_id) throw new AppError(400, 'trimestre_id es requerido', 'MISSING_PARAM')
      res.json({
        data: await this.service.getHijo(
          req.auth!.usuario_id,
          req.params['estudiante_id']!,
          trimestre_id,
          req.auth!.institucion_id,
        ),
      })
    } catch (e) { next(e) }
  }

  getParaStaff = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { trimestre_id } = req.query as Record<string, string>
      if (!trimestre_id) throw new AppError(400, 'trimestre_id es requerido', 'MISSING_PARAM')
      res.json({
        data: await this.service.getParaStaff(
          req.params['estudiante_id']!,
          trimestre_id,
          req.auth!.institucion_id,
        ),
      })
    } catch (e) { next(e) }
  }
}
