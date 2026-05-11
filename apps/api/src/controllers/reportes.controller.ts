import type { Request, Response, NextFunction } from 'express'
import { ReportesService } from '../services/reportes.service'
import { AppError }        from '../middlewares/errorHandler'
import { generarHTMLCentralizador } from '../templates/centralizador.template'
import { generarHTMLCuadroHonor }   from '../templates/cuadro-honor.template'
import { generatePDF, generatePDFLandscape } from '../utils/pdf.generator'
import { generateCentralizadorExcel }        from '../utils/excel.generator'

export class ReportesController {
  private service = new ReportesService()

  cuadroHonor = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { paralelo_id, trimestre_id } = req.query as Record<string, string>
      if (!paralelo_id || !trimestre_id) throw new AppError(400, 'paralelo_id y trimestre_id son requeridos', 'MISSING_PARAM')
      const data = await this.service.getCuadroHonor(paralelo_id, trimestre_id, req.auth!.institucion_id)
      res.json({ data })
    } catch (e) { next(e) }
  }

  cuadroHonorPdf = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { paralelo_id, trimestre_id } = req.query as Record<string, string>
      if (!paralelo_id || !trimestre_id) throw new AppError(400, 'paralelo_id y trimestre_id son requeridos', 'MISSING_PARAM')
      const data = await this.service.getCuadroHonor(paralelo_id, trimestre_id, req.auth!.institucion_id)
      const html = generarHTMLCuadroHonor(data)
      const pdf  = await generatePDFLandscape(html)
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', `attachment; filename="cuadro_honor_T${data.trimestre}.pdf"`)
      res.send(pdf)
    } catch (e) { next(e) }
  }

  centralizador = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { paralelo_id, trimestre_id } = req.query as Record<string, string>
      if (!paralelo_id || !trimestre_id) throw new AppError(400, 'paralelo_id y trimestre_id son requeridos', 'MISSING_PARAM')
      const data = await this.service.getCentralizador(paralelo_id, trimestre_id, req.auth!.institucion_id)
      res.json({ data })
    } catch (e) { next(e) }
  }

  centralizadorPdf = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { paralelo_id, trimestre_id } = req.query as Record<string, string>
      if (!paralelo_id || !trimestre_id) throw new AppError(400, 'paralelo_id y trimestre_id son requeridos', 'MISSING_PARAM')
      const data = await this.service.getCentralizador(paralelo_id, trimestre_id, req.auth!.institucion_id)
      const html = generarHTMLCentralizador(data)
      const pdf  = await generatePDFLandscape(html)
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', `attachment; filename="centralizador_T${data.trimestre}.pdf"`)
      res.send(pdf)
    } catch (e) { next(e) }
  }

  centralizadorExcel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { paralelo_id, trimestre_id } = req.query as Record<string, string>
      if (!paralelo_id || !trimestre_id) throw new AppError(400, 'paralelo_id y trimestre_id son requeridos', 'MISSING_PARAM')
      const data = await this.service.getCentralizador(paralelo_id, trimestre_id, req.auth!.institucion_id)
      const buf  = generateCentralizadorExcel(data)
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      res.setHeader('Content-Disposition', `attachment; filename="centralizador_${data.grado}_${data.paralelo}_T${data.trimestre}.xlsx"`)
      res.send(buf)
    } catch (e) { next(e) }
  }

  parciales = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { trimestre_id, paralelo_id } = req.query as Record<string, string>
      if (!trimestre_id || !paralelo_id) throw new AppError(400, 'trimestre_id y paralelo_id son requeridos', 'MISSING_PARAM')
      const data = await this.service.getParciales(trimestre_id, paralelo_id, req.auth!.institucion_id)
      res.json({ data })
    } catch (e) { next(e) }
  }

  carpetas = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { trimestre_id, paralelo_id } = req.query as Record<string, string>
      if (!trimestre_id || !paralelo_id) throw new AppError(400, 'trimestre_id y paralelo_id son requeridos', 'MISSING_PARAM')
      const data = await this.service.getCarpetasEntregables(trimestre_id, paralelo_id, req.auth!.institucion_id)
      res.json({ data })
    } catch (e) { next(e) }
  }

  promocionAnual = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { paralelo_id, gestion_id } = req.query as Record<string, string>
      if (!paralelo_id || !gestion_id) throw new AppError(400, 'paralelo_id y gestion_id son requeridos', 'MISSING_PARAM')
      const data = await this.service.getPromocionAnual(paralelo_id, gestion_id, req.auth!.institucion_id)
      res.json({ data })
    } catch (e) { next(e) }
  }
}
