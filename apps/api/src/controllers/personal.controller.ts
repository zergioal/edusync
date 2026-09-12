import type { Request, Response, NextFunction } from 'express'
import { PersonalService } from '../services/personal.service'

export class PersonalController {
  private service = new PersonalService()

  findAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this.service.findAll(req.auth!.institucion_id)
      res.json({ data })
    } catch (e) { next(e) }
  }

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { nombre, apellido, email, rol, nivel_ids, es_bth } = req.body as {
        nombre: string; apellido: string; email: string; rol: string; nivel_ids?: string[]; es_bth?: boolean
      }
      const data = await this.service.create(req.auth!.institucion_id, { nombre, apellido, email, rol, nivel_ids, es_bth })
      res.status(201).json({ data })
    } catch (e) { next(e) }
  }

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { nombre, apellido, activo, nivel_ids, es_bth } = req.body as {
        nombre?: string; apellido?: string; activo?: boolean; nivel_ids?: string[]; es_bth?: boolean
      }
      const data = await this.service.update(req.params['id']!, { nombre, apellido, activo, nivel_ids, es_bth })
      res.json({ data })
    } catch (e) { next(e) }
  }

  remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.service.remove(req.params['id']!)
      res.status(204).send()
    } catch (e) { next(e) }
  }
}
