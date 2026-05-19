import type { Request, Response, NextFunction } from 'express'
import { AsistenciaService } from '../services/asistencia.service'
import { AppError }          from '../middlewares/errorHandler'

export class AsistenciaController {
  private service = new AsistenciaService()

  // ── Vistas estudiante/padre ────────────────────────────────────────────────

  getMia = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { trimestre_id } = req.query as Record<string, string>
      if (!trimestre_id) throw new AppError(400, 'trimestre_id es requerido', 'MISSING_PARAM')
      res.json({ data: await this.service.getMia(req.auth!.usuario_id, trimestre_id) })
    } catch (e) { next(e) }
  }

  getHijo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { trimestre_id } = req.query as Record<string, string>
      if (!trimestre_id) throw new AppError(400, 'trimestre_id es requerido', 'MISSING_PARAM')
      res.json({
        data: await this.service.getHijo(
          req.auth!.usuario_id,
          req.params['estudiante_id']!,
          trimestre_id,
        ),
      })
    } catch (e) { next(e) }
  }

  // ── Asistencia de clase (docente) ─────────────────────────────────────────

  registrarClase = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { asignacion_id, fecha, registros } = req.body as {
        asignacion_id: string
        fecha: string
        registros: Array<{ estudiante_id: string; estado: 'PRESENTE' | 'AUSENTE' | 'TARDANZA' }>
      }
      const data = await this.service.registrarClase(
        asignacion_id, fecha, registros, req.auth!.usuario_id,
      )
      res.status(201).json({ data })
    } catch (e) { next(e) }
  }

  getClaseMensual = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { asignacion_id, mes } = req.query as { asignacion_id: string; mes: string }
      if (!asignacion_id || !mes) throw new AppError(400, 'asignacion_id y mes requeridos', 'MISSING_PARAM')
      res.json({ data: await this.service.getClaseMensual(asignacion_id, mes) })
    } catch (e) { next(e) }
  }

  getClase = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { asignacion_id, fecha } = req.query as { asignacion_id: string; fecha: string }
      if (!asignacion_id || !fecha) throw new AppError(400, 'asignacion_id y fecha requeridos', 'MISSING_PARAM')
      res.json({ data: await this.service.getClase(asignacion_id, fecha) })
    } catch (e) { next(e) }
  }

  reporteClase = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { paralelo_id, materia_id, fecha_inicio, fecha_fin } = req.query as Record<string, string>
      if (!paralelo_id || !fecha_inicio || !fecha_fin) {
        throw new AppError(400, 'paralelo_id, fecha_inicio y fecha_fin requeridos', 'MISSING_PARAM')
      }
      const data = await this.service.reporteClase(req.auth!.institucion_id, {
        paralelo_id,
        fecha_inicio,
        fecha_fin,
        ...(materia_id ? { materia_id } : {}),
      })
      res.json({ data })
    } catch (e) { next(e) }
  }

  // ── Asistencia diaria (regente) ───────────────────────────────────────────

  registrarDiaria = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { paralelo_id, fecha, registros } = req.body as {
        paralelo_id: string
        fecha: string
        registros: Array<{ estudiante_id: string; estado: 'PRESENTE' | 'AUSENTE' | 'TARDANZA' }>
      }
      const data = await this.service.registrarDiaria(req.auth!.usuario_id, paralelo_id, fecha, registros)
      res.status(201).json({ data })
    } catch (e) { next(e) }
  }

  getDiaria = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { paralelo_id, fecha } = req.query as { paralelo_id: string; fecha: string }
      if (!paralelo_id || !fecha) throw new AppError(400, 'paralelo_id y fecha requeridos', 'MISSING_PARAM')
      res.json({ data: await this.service.getDiaria(paralelo_id, fecha) })
    } catch (e) { next(e) }
  }

  reporteDiaria = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { paralelo_id, fecha_inicio, fecha_fin, estudiante_id } = req.query as Record<string, string>
      if (!paralelo_id || !fecha_inicio || !fecha_fin) {
        throw new AppError(400, 'paralelo_id, fecha_inicio y fecha_fin requeridos', 'MISSING_PARAM')
      }
      res.json({ data: await this.service.reporteDiaria({
        paralelo_id,
        fecha_inicio,
        fecha_fin,
        ...(estudiante_id ? { estudiante_id } : {}),
      }) })
    } catch (e) { next(e) }
  }

  // ── Consolidada por estudiante ────────────────────────────────────────────

  getConsolidada = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { trimestre_id } = req.query as { trimestre_id: string }
      if (!trimestre_id) throw new AppError(400, 'trimestre_id requerido', 'MISSING_PARAM')
      res.json({ data: await this.service.consolidada(req.params['estudiante_id']!, trimestre_id) })
    } catch (e) { next(e) }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  getParalelosRegente = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.json({ data: await this.service.getParalelosRegente(req.auth!.usuario_id) })
    } catch (e) { next(e) }
  }

  getEstudiantesParalelo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { paralelo_id, gestion_id } = req.query as { paralelo_id: string; gestion_id: string }
      if (!paralelo_id || !gestion_id) throw new AppError(400, 'paralelo_id y gestion_id requeridos', 'MISSING_PARAM')
      res.json({ data: await this.service.getEstudiantesParalelo(paralelo_id, gestion_id) })
    } catch (e) { next(e) }
  }
}
