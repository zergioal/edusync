import type { Request, Response, NextFunction } from 'express'
import { ParalelosService } from '../services/paralelos.service'

export class ParalelosController {
  private service = new ParalelosService()

  findAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { gestion_id, grado_id } = req.query as Record<string, string | undefined>
      res.json({ data: await this.service.findAll(req.auth!.institucion_id, gestion_id, grado_id) })
    } catch (e) { next(e) }
  }

  findOne = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.json({ data: await this.service.findOne(req.params['id']!) })
    } catch (e) { next(e) }
  }

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { grado_id, letra, asesor_id } = req.body as {
        grado_id: string; letra: string; asesor_id?: string
      }
      res.status(201).json({ data: await this.service.create({
        grado_id, letra,
        ...(asesor_id ? { asesor_id } : {}),
      }) })
    } catch (e) { next(e) }
  }

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.json({ data: await this.service.update(req.params['id']!, req.body) })
    } catch (e) { next(e) }
  }

  deactivate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.json({ data: await this.service.deactivate(req.params['id']!) })
    } catch (e) { next(e) }
  }
}
