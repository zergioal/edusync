import type { Request, Response, NextFunction } from 'express'
import { IndicadoresService, createIndicadorSchema, updateIndicadorSchema } from '../services/indicadores.service'
import { AppError } from '../middlewares/errorHandler'

export class IndicadoresController {
  private service = new IndicadoresService()

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = createIndicadorSchema.safeParse(req.body)
      if (!parsed.success) {
        throw new AppError(400, parsed.error.errors[0]?.message ?? 'Datos inválidos', 'VALIDATION')
      }
      res.status(201).json({ data: await this.service.create(parsed.data, req.auth!.usuario_id) })
    } catch (e) { next(e) }
  }

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = updateIndicadorSchema.safeParse(req.body)
      if (!parsed.success) {
        throw new AppError(400, parsed.error.errors[0]?.message ?? 'Datos inválidos', 'VALIDATION')
      }
      res.json({ data: await this.service.update(req.params['id']!, parsed.data, req.auth!.usuario_id) })
    } catch (e) { next(e) }
  }

  remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.service.remove(req.params['id']!, req.auth!.usuario_id)
      res.status(204).send()
    } catch (e) { next(e) }
  }
}
