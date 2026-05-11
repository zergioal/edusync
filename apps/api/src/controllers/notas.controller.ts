import type { Request, Response, NextFunction } from 'express'
import { NotasService } from '../services/notas.service'
import { AppError } from '../middlewares/errorHandler'

export class NotasController {
  private service = new NotasService()

  upsert = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { indicador_id, estudiante_id, puntaje } = req.body as {
        indicador_id:  string
        estudiante_id: string
        puntaje:       number | null
      }
      if (!indicador_id || !estudiante_id) {
        throw new AppError(400, 'indicador_id y estudiante_id son requeridos', 'VALIDATION')
      }
      res.json({ data: await this.service.upsert({ indicador_id, estudiante_id, puntaje }, req.auth!.usuario_id) })
    } catch (e) { next(e) }
  }
}
