import type { Request, Response, NextFunction } from 'express'
import { NivelesService } from '../services/niveles.service'

export class NivelesController {
  private service = new NivelesService()

  findAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.json({ data: await this.service.findAll(req.auth!.institucion_id) })
    } catch (e) { next(e) }
  }
}
