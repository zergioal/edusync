import type { Request, Response, NextFunction } from 'express'
import { ConfiguracionService } from '../services/configuracion.service'

export class ConfiguracionController {
  private service = new ConfiguracionService()

  getConfig = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.json({ data: await this.service.getConfig(req.auth!.institucion_id) })
    } catch (e) { next(e) }
  }

  updateConfig = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.json({ data: await this.service.updateConfig(req.auth!.institucion_id, req.body) })
    } catch (e) { next(e) }
  }
}
