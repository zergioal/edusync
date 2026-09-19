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

  findAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const nivel_id = req.query['nivel_id'] as string | undefined
      res.json({ data: await this.service.findAdmin(req.auth!.institucion_id, nivel_id) })
    } catch (e) { next(e) }
  }

  findCampos = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const nivel_id = req.query['nivel_id'] as string | undefined
      res.json({ data: await this.service.findCampos(req.auth!.institucion_id, nivel_id) })
    } catch (e) { next(e) }
  }

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {
        nombre, es_subarea_de_id, campo_id, solo_si_bth,
        aplica_solo_desde_grado, aplica_hasta_grado, horas_semanales,
      } = req.body as {
        nombre: string; es_subarea_de_id?: string; campo_id?: string; solo_si_bth?: boolean
        aplica_solo_desde_grado?: number | null; aplica_hasta_grado?: number | null; horas_semanales?: number | null
      }
      if (!nombre) throw new AppError(400, 'nombre es requerido', 'VALIDATION')
      if (!es_subarea_de_id && !campo_id) {
        throw new AppError(400, 'campo_id es requerido para crear un área', 'VALIDATION')
      }
      const data = await this.service.create(req.auth!.institucion_id, {
        nombre, es_subarea_de_id, campo_id, solo_si_bth, aplica_solo_desde_grado, aplica_hasta_grado, horas_semanales,
      })
      res.status(201).json({ data })
    } catch (e) { next(e) }
  }

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { nombre, activa, solo_si_bth, aplica_solo_desde_grado, aplica_hasta_grado, horas_semanales } = req.body as {
        nombre?: string; activa?: boolean; solo_si_bth?: boolean
        aplica_solo_desde_grado?: number | null; aplica_hasta_grado?: number | null; horas_semanales?: number | null
      }
      const data = await this.service.update(req.auth!.institucion_id, req.params['id']!, {
        nombre, activa, solo_si_bth, aplica_solo_desde_grado, aplica_hasta_grado, horas_semanales,
      })
      res.json({ data })
    } catch (e) { next(e) }
  }

  remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this.service.remove(req.auth!.institucion_id, req.params['id']!)
      res.json({ data })
    } catch (e) { next(e) }
  }
}
