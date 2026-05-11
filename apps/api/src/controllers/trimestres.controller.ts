import type { Request, Response, NextFunction } from 'express'
import { TrimestresesService } from '../services/trimestres.service'

export class TrimestresesController {
  private service = new TrimestresesService()

  findAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const gestion_id = req.query['gestion_id'] as string
      if (!gestion_id) { res.status(400).json({ error: 'gestion_id requerido' }); return }
      res.json({ data: await this.service.findAll(gestion_id) })
    } catch (e) { next(e) }
  }

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.json({ data: await this.service.update(req.params['id']!, req.body) })
    } catch (e) { next(e) }
  }

  cerrar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.json({ data: await this.service.cerrar(req.params['id']!) })
    } catch (e) { next(e) }
  }
}
