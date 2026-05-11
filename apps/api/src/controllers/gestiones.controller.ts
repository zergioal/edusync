import type { Request, Response, NextFunction } from 'express'
import { GestionesService } from '../services/gestiones.service'

export class GestionesController {
  private service = new GestionesService()

  findAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this.service.findAll(req.auth!.institucion_id)
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
      const data = await this.service.create(req.auth!.institucion_id, req.body)
      res.status(201).json({ data })
    } catch (e) { next(e) }
  }

  findActiva = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.json({ data: await this.service.findActiva(req.auth!.institucion_id) })
    } catch (e) { next(e) }
  }

  activar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this.service.activar(req.auth!.institucion_id, req.params['id']!)
      res.json({ data })
    } catch (e) { next(e) }
  }

  cerrar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this.service.cerrar(req.params['id']!, req.auth!.institucion_id)
      res.json({ data })
    } catch (e) { next(e) }
  }

  getResultados = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { paralelo_id } = req.query as { paralelo_id?: string }
      const data = await this.service.getResultados(req.params['id']!, {
        ...(paralelo_id ? { paralelo_id } : {}),
      })
      res.json({ data })
    } catch (e) { next(e) }
  }
}
