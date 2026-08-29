import type { Request, Response, NextFunction } from 'express'
import type { CategoriaObservacion } from '@edusync/database'
import { ObservacionesDiariasService } from '../services/observaciones-diarias.service'
import { AppError } from '../middlewares/errorHandler'
import { generarHTMLTablaSimple } from '../templates/reporte-tabla.template'
import { generatePDFLandscape } from '../utils/pdf.generator'

type ModoReporte = 'mes' | 'trimestre' | 'anno'

export class ObservacionesDiariasController {
  private service = new ObservacionesDiariasService()

  roster = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.json({ data: await this.service.roster(req.auth!.usuario_id, req.params['paralelo_id']!) })
    } catch (e) { next(e) }
  }

  crear = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { estudiante_id, paralelo_id, asignacion_id, categoria, detalle } = req.body as {
        estudiante_id: string
        paralelo_id:   string
        asignacion_id?: string
        categoria:     CategoriaObservacion
        detalle?:      string
      }
      const data = await this.service.crear(req.auth!.usuario_id, {
        estudiante_id, paralelo_id, asignacion_id, categoria, detalle,
      })
      res.status(201).json({ data })
    } catch (e) { next(e) }
  }

  eliminar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.service.eliminar(req.params['id']!, req.auth!.usuario_id)
      res.status(204).send()
    } catch (e) { next(e) }
  }

  getMia = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.json({ data: await this.service.getMia(req.auth!.usuario_id) })
    } catch (e) { next(e) }
  }

  getHijo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.json({ data: await this.service.getHijo(req.auth!.usuario_id, req.params['estudiante_id']!) })
    } catch (e) { next(e) }
  }

  private parseFiltro(req: Request) {
    const { paralelo_id, modo, mes, trimestre_id, gestion_id } = req.query as Record<string, string>
    if (!paralelo_id || !modo) throw new AppError(400, 'paralelo_id y modo son requeridos', 'MISSING_PARAM')
    return { paralelo_id, filtro: { modo: modo as ModoReporte, mes, trimestre_id, gestion_id } }
  }

  reporte = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { paralelo_id, filtro } = this.parseFiltro(req)
      res.json({ data: await this.service.reporte(paralelo_id, req.auth!.institucion_id, filtro) })
    } catch (e) { next(e) }
  }

  reportePdf = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { paralelo_id, filtro } = this.parseFiltro(req)
      const data = await this.service.reporte(paralelo_id, req.auth!.institucion_id, filtro)
      const html = generarHTMLTablaSimple({
        titulo:    `Control Diario — ${data.curso}`,
        subtitulo: data.periodo,
        columnas: [
          { header: 'Fecha',       key: 'fecha' },
          { header: 'Estudiante',  key: 'estudiante' },
          { header: 'Materia',     key: 'materia' },
          { header: 'Observación', key: 'categoria' },
          { header: 'Detalle',     key: 'detalle' },
          { header: 'Docente',     key: 'docente' },
        ],
        filas: data.observaciones,
      })
      const pdf = await generatePDFLandscape(html)
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', 'attachment; filename="control_diario.pdf"')
      res.send(pdf)
    } catch (e) { next(e) }
  }
}
