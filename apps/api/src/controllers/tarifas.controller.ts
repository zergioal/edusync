import type { Request, Response, NextFunction } from 'express'
import { TarifasService } from '../services/tarifas.service'

export class TarifasController {
  private service = new TarifasService()

  findByGestion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { gestion_id } = req.query as { gestion_id?: string }
      if (!gestion_id) { res.status(400).json({ error: 'BAD_REQUEST', message: 'gestion_id requerido' }); return }
      const data = await this.service.findByGestion(req.auth!.institucion_id, gestion_id)
      res.json({ data })
    } catch (e) { next(e) }
  }

  upsertBatch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { gestion_id, tarifas } = req.body as { gestion_id: string; tarifas: { nivel_id: string; monto: number }[] }
      const data = await this.service.upsertBatch(req.auth!.institucion_id, gestion_id, tarifas)
      res.json({ data })
    } catch (e) { next(e) }
  }
}
