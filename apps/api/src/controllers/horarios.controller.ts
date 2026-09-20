import type { Request, Response, NextFunction } from 'express'
import { HorariosService } from '../services/horarios.service'
import { AppError } from '../middlewares/errorHandler'
import { generarHTMLTablaSimple } from '../templates/reporte-tabla.template'
import { generatePDFLandscape } from '../utils/pdf.generator'
import { generateTablaSimpleExcel } from '../utils/excel.generator'
import { getInstitucionInfo } from '../utils/institucion.util'

export class HorariosController {
  private service = new HorariosService()

  getMiConfig = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.json({ data: await this.service.getMiConfig(req.auth!.usuario_id, req.auth!.institucion_id) })
    } catch (e) { next(e) }
  }

  getMio = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.json({ data: await this.service.getMio(req.auth!.usuario_id, req.auth!.institucion_id) })
    } catch (e) { next(e) }
  }

  guardarCelda = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { dia_semana, periodo, asignacion_id } = req.body as {
        dia_semana: number; periodo: number; asignacion_id: string
      }
      if (dia_semana == null || periodo == null || !asignacion_id) {
        throw new AppError(400, 'dia_semana, periodo y asignacion_id son requeridos', 'MISSING_PARAM')
      }
      const data = await this.service.guardarCelda(req.auth!.usuario_id, req.auth!.institucion_id, {
        dia_semana, periodo, asignacion_id,
      })
      res.json({ data })
    } catch (e) { next(e) }
  }

  borrarCelda = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { dia_semana, periodo } = req.query as Record<string, string>
      if (!dia_semana || !periodo) throw new AppError(400, 'dia_semana y periodo son requeridos', 'MISSING_PARAM')
      await this.service.borrarCelda(req.auth!.usuario_id, req.auth!.institucion_id, Number(dia_semana), Number(periodo))
      res.status(204).send()
    } catch (e) { next(e) }
  }

  getMioPdf = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const [tabla, institucion] = await Promise.all([
        this.service.getMiTabla(req.auth!.usuario_id, req.auth!.institucion_id),
        getInstitucionInfo(req.auth!.institucion_id),
      ])
      const html = generarHTMLTablaSimple({
        institucion,
        titulo:    `Horario — ${tabla.docente}`,
        subtitulo: `Gestión ${tabla.gestion}`,
        columnas:  tabla.columnas,
        filas:     tabla.filas,
      })
      const pdf = await generatePDFLandscape(html)
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', 'attachment; filename="mi_horario.pdf"')
      res.send(pdf)
    } catch (e) { next(e) }
  }

  getMioExcel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tabla = await this.service.getMiTabla(req.auth!.usuario_id, req.auth!.institucion_id)
      const buf = generateTablaSimpleExcel({
        titulo:    `Horario — ${tabla.docente}`,
        subtitulo: `Gestión ${tabla.gestion}`,
        columnas:  tabla.columnas,
        filas:     tabla.filas,
      })
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      res.setHeader('Content-Disposition', 'attachment; filename="mi_horario.xlsx"')
      res.send(buf)
    } catch (e) { next(e) }
  }
}
