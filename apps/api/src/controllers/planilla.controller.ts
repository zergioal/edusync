import type { Request, Response, NextFunction } from 'express'
import { PlanillaService } from '../services/planilla.service'

export class PlanillaController {
  private service = new PlanillaService()

  get = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const trimestre_id = req.query['trimestre_id'] as string | undefined
      res.json({ data: await this.service.get(req.params['asignacion_id']!, trimestre_id) })
    } catch (e) { next(e) }
  }
}
