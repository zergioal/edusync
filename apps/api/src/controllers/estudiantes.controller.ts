import type { Request, Response, NextFunction } from 'express'
import { EstudiantesService } from '../services/estudiantes.service'

export class EstudiantesController {
  private service = new EstudiantesService()

  findAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { gestion_id, paralelo_id, buscar } = req.query as Record<string, string | undefined>
      res.json({ data: await this.service.findAll(req.auth!.institucion_id, {
        ...(gestion_id  ? { gestion_id }  : {}),
        ...(paralelo_id ? { paralelo_id } : {}),
        ...(buscar      ? { buscar }      : {}),
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
      res.status(201).json({ data: await this.service.matricular(req.auth!.institucion_id, req.body) })
    } catch (e) { next(e) }
  }

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.json({ data: await this.service.update(req.params['id']!, req.body) })
    } catch (e) { next(e) }
  }
}
