import type { Request, Response, NextFunction } from 'express'
import { MatriculasService } from '../services/matriculas.service'

export class MatriculasController {
  private service = new MatriculasService()

  findAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { gestion_id, paralelo_id } = req.query as Record<string, string | undefined>
      res.json({ data: await this.service.findAll({
        ...(gestion_id  ? { gestion_id }  : {}),
        ...(paralelo_id ? { paralelo_id } : {}),
      }) })
    } catch (e) { next(e) }
  }

  toggleTecnica = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { estudiante_id, gestion_id } = req.params as { estudiante_id: string; gestion_id: string }
      const { lleva_tecnica } = req.body as { lleva_tecnica: boolean }
      res.json({ data: await this.service.toggleLlevaTecnica(estudiante_id, gestion_id, lleva_tecnica) })
    } catch (e) { next(e) }
  }

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { estudiante_id, paralelo_id, gestion_id } = req.body as {
        estudiante_id: string; paralelo_id: string; gestion_id: string
      }
      res.status(201).json({ data: await this.service.create({ estudiante_id, paralelo_id, gestion_id }) })
    } catch (e) { next(e) }
  }
}
