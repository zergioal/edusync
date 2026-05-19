import type { Request, Response, NextFunction } from 'express'
import { PadresService } from '../services/padres.service'

export class PadresController {
  private service = new PadresService()

  findAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { buscar, paralelo_id } = req.query as Record<string, string | undefined>
      res.json({ data: await this.service.findAll(req.auth!.institucion_id, {
        ...(buscar      ? { buscar }      : {}),
        ...(paralelo_id ? { paralelo_id } : {}),
      }) })
    } catch (e) { next(e) }
  }

  findOne = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.json({ data: await this.service.findOne(req.params['id']!) })
    } catch (e) { next(e) }
  }

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.status(201).json({ data: await this.service.create(req.auth!.institucion_id, req.body) })
    } catch (e) { next(e) }
  }

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.json({ data: await this.service.update(req.params['id']!, req.body) })
    } catch (e) { next(e) }
  }

  remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.service.remove(req.params['id']!)
      res.status(204).send()
    } catch (e) { next(e) }
  }
}
