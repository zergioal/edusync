import type { Request, Response, NextFunction } from 'express'
import type { EstadoDefensaBTH } from '@prisma/client'
import { ProyectosBTHService } from '../services/proyectos-bth.service'
import { AppError } from '../middlewares/errorHandler'

export class ProyectosBTHController {
  private service = new ProyectosBTHService()

  findAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { gestion_id } = req.query as Record<string, string>
      if (!gestion_id) throw new AppError(400, 'gestion_id es requerido', 'MISSING_PARAM')
      const data = await this.service.findAll(req.auth!.institucion_id, gestion_id)
      res.json({ data })
    } catch (e) { next(e) }
  }

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { nombre, gestion_id, estudiante_ids } = req.body as {
        nombre: string; gestion_id: string; estudiante_ids: string[]
      }
      const data = await this.service.create(req.auth!.institucion_id, { nombre, gestion_id, estudiante_ids })
      res.status(201).json({ data })
    } catch (e) { next(e) }
  }

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { nombre, porcentaje_avance, estado_defensa, estudiante_ids } = req.body as {
        nombre?: string; porcentaje_avance?: number; estado_defensa?: EstadoDefensaBTH; estudiante_ids?: string[]
      }
      const data = await this.service.update(req.params['id']!, { nombre, porcentaje_avance, estado_defensa, estudiante_ids })
      res.json({ data })
    } catch (e) { next(e) }
  }

  remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.service.remove(req.params['id']!)
      res.status(204).send()
    } catch (e) { next(e) }
  }

  miProyecto = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this.service.miProyecto(req.auth!.usuario_id)
      res.json({ data })
    } catch (e) { next(e) }
  }

  proyectoDeHijo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this.service.proyectoDeHijo(req.auth!.usuario_id, req.params['estudiante_id']!)
      res.json({ data })
    } catch (e) { next(e) }
  }
}
