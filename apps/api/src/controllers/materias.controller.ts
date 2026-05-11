import type { Request, Response, NextFunction } from 'express'
import { MateriasService } from '../services/materias.service'
import { AppError } from '../middlewares/errorHandler'

export class MateriasController {
  private service = new MateriasService()

  findAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const nivel_id = req.query['nivel_id'] as string | undefined
      res.json({ data: await this.service.findAll(req.auth!.institucion_id, nivel_id) })
    } catch (e) { next(e) }
  }

  findDisponibles = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const paralelo_id = req.query['paralelo_id'] as string | undefined
      if (!paralelo_id) throw new AppError(400, 'paralelo_id es requerido', 'VALIDATION')
      res.json({ data: await this.service.findDisponibles(req.auth!.institucion_id, paralelo_id) })
    } catch (e) { next(e) }
  }

  findCargaHoraria = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const nivel_id = req.query['nivel_id'] as string | undefined
      if (!nivel_id) throw new AppError(400, 'nivel_id es requerido', 'VALIDATION')
      res.json({ data: await this.service.findCargaHoraria(req.auth!.institucion_id, nivel_id) })
    } catch (e) { next(e) }
  }

  updateCargaHoraria = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const entries = req.body as { materia_id: string; grado_id: string; horas_mes: number }[]
      if (!Array.isArray(entries)) throw new AppError(400, 'Se esperaba un array de entradas', 'VALIDATION')
      await this.service.updateCargaHoraria(entries)
      res.json({ data: null })
    } catch (e) { next(e) }
  }
}
