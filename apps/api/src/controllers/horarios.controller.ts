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

  guardarHorarioCompleto = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { celdas } = req.body as { celdas: { dia_semana: number; periodo: number; asignacion_id: string }[] }
      if (!Array.isArray(celdas)) throw new AppError(400, 'celdas debe ser un arreglo', 'MISSING_PARAM')
      const data = await this.service.guardarHorarioCompleto(req.auth!.usuario_id, req.auth!.institucion_id, celdas)
      res.json({ data })
    } catch (e) { next(e) }
  }

  getMioPdf = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const [tabla, institucion] = await Promise.all([
        this.service.getMiTabla(req.auth!.usuario_id, req.auth!.institucion_id),
        getInstitucionInfo(req.auth!.institucion_id),
      ])
      const filasHtml = tabla.filas.map(fila => {
        const nueva: Record<string, string | number | null | undefined> = {}
        for (const [k, v] of Object.entries(fila)) nueva[k] = typeof v === 'string' ? v.replace(/\n/g, '<br/>') : v
        return nueva
      })
      const html = generarHTMLTablaSimple({
        institucion,
        titulo:     `Horario — ${tabla.docente}`,
        subtitulo:  `Gestión ${tabla.gestion}`,
        columnas:   tabla.columnas,
        filas:      filasHtml,
        anchoIgual: true,
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
