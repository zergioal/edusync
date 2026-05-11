import type { Request, Response, NextFunction } from 'express'
import { AsignacionesService } from '../services/asignaciones.service'

export class AsignacionesController {
  private service = new AsignacionesService()

  findAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const paralelo_id = req.query['paralelo_id'] as string | undefined
      const gestion_id  = req.query['gestion_id']  as string | undefined
      res.json({
        data: await this.service.findAll(req.auth!.institucion_id, {
          ...(paralelo_id ? { paralelo_id } : {}),
          ...(gestion_id  ? { gestion_id  } : {}),
        }),
      })
    } catch (e) { next(e) }
  }

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { docente_id, materia_id, paralelo_id, gestion_id } = req.body as {
        docente_id: string; materia_id: string; paralelo_id: string; gestion_id: string
      }
      res.status(201).json({
        data: await this.service.create({ docente_id, materia_id, paralelo_id, gestion_id }),
      })
    } catch (e) { next(e) }
  }

  findOne = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.json({ data: await this.service.findOne(req.params['id']!) })
    } catch (e) { next(e) }
  }

  findMias = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.json({ data: await this.service.findMias(req.auth!.usuario_id) })
    } catch (e) { next(e) }
  }

  remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.service.remove(req.params['id']!)
      res.status(204).send()
    } catch (e) { next(e) }
  }
}
