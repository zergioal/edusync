import type { Request, Response, NextFunction } from 'express'
import { GradosService } from '../services/grados.service'

export class GradosController {
  private service = new GradosService()

  findAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const nivel_id = req.query['nivel_id'] as string | undefined
      res.json({ data: await this.service.findAll(req.auth!.institucion_id, nivel_id) })
    } catch (e) { next(e) }
  }
}
