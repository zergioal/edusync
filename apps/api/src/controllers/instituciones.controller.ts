import type { Request, Response, NextFunction } from 'express'
import { InstitucionesService } from '../services/instituciones.service'

export class InstitucionesController {
  private service = new InstitucionesService()

  findAll = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this.service.findAll()
      res.json({ data })
    } catch (e) { next(e) }
  }

  findOne = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this.service.findOne(req.params['id']!)
      res.json({ data })
    } catch (e) { next(e) }
  }

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this.service.create(req.body)
      res.status(201).json({ data })
    } catch (e) { next(e) }
  }

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this.service.update(req.params['id']!, req.body)
      res.json({ data })
    } catch (e) { next(e) }
  }
}
