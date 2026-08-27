import type { Request, Response, NextFunction } from 'express'
import { PlanillaService } from '../services/planilla.service'
import { AppError } from '../middlewares/errorHandler'
import { generarHTMLRegistroMateria, type DatosRegistroMateria } from '../templates/registro-materia.template'
import { generarHTMLCentralizadorAsignacion, type DatosCentralizadorAsignacion } from '../templates/centralizador-asignacion.template'
import { generatePDFLandscape } from '../utils/pdf.generator'
import { generateRegistroMateriaExcel, generateCentralizadorAsignacionExcel } from '../utils/excel.generator'

export class PlanillaController {
  private service = new PlanillaService()

  get = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const trimestre_id = req.query['trimestre_id'] as string | undefined
      res.json({ data: await this.service.get(req.params['asignacion_id']!, trimestre_id) })
    } catch (e) { next(e) }
  }

  private async buildRegistroData(asignacion_id: string, trimestre_id: string): Promise<DatosRegistroMateria> {
    const data = await this.service.get(asignacion_id, trimestre_id)
    const trimestre = data.asignacion.gestion.trimestres.find(t => t.id === trimestre_id)
    return {
      materia:   data.asignacion.materia.nombre,
      campo:     data.asignacion.materia.campo.nombre,
      nivel:     data.asignacion.paralelo.grado.nivel.nombre,
      grado:     data.asignacion.paralelo.grado.nombre,
      paralelo:  data.asignacion.paralelo.letra,
      anno:      data.asignacion.gestion.anno,
      docente:   `${data.asignacion.docente.nombre} ${data.asignacion.docente.apellido}`,
      trimestre: trimestre?.numero ?? 0,
      dimensiones: data.dimensiones.map(d => ({
        id: d.id, nombre: d.nombre, puntaje_max: d.puntaje_max,
        indicadores: d.indicadores.map(i => ({ id: i.id, nombre: i.nombre })),
      })),
      estudiantes: data.estudiantes,
    }
  }

  getRegistroPdf = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { trimestre_id } = req.query as Record<string, string>
      if (!trimestre_id) throw new AppError(400, 'trimestre_id es requerido', 'MISSING_PARAM')
      const payload = await this.buildRegistroData(req.params['asignacion_id']!, trimestre_id)
      const pdf = await generatePDFLandscape(generarHTMLRegistroMateria(payload))
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', `attachment; filename="registro_${payload.materia}_T${payload.trimestre}.pdf"`)
      res.send(pdf)
    } catch (e) { next(e) }
  }

  getRegistroExcel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { trimestre_id } = req.query as Record<string, string>
      if (!trimestre_id) throw new AppError(400, 'trimestre_id es requerido', 'MISSING_PARAM')
      const payload = await this.buildRegistroData(req.params['asignacion_id']!, trimestre_id)
      const buf = generateRegistroMateriaExcel(payload)
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      res.setHeader('Content-Disposition', `attachment; filename="registro_${payload.materia}_T${payload.trimestre}.xlsx"`)
      res.send(buf)
    } catch (e) { next(e) }
  }

  private async buildCentralizadorAsignacionData(asignacion_id: string): Promise<DatosCentralizadorAsignacion> {
    const data = await this.service.getCentralizadorAsignacion(asignacion_id)
    return {
      materia:    data.asignacion.materia.nombre,
      nivel:      data.asignacion.paralelo.grado.nivel.nombre,
      grado:      data.asignacion.paralelo.grado.nombre,
      paralelo:   data.asignacion.paralelo.letra,
      anno:       data.asignacion.gestion.anno,
      meta:       data.meta,
      trimestres: data.trimestres,
      estudiantes: data.estudiantes,
    }
  }

  getCentralizadorAsignacionPdf = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const payload = await this.buildCentralizadorAsignacionData(req.params['asignacion_id']!)
      const pdf = await generatePDFLandscape(generarHTMLCentralizadorAsignacion(payload))
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', `attachment; filename="centralizador_${payload.materia}.pdf"`)
      res.send(pdf)
    } catch (e) { next(e) }
  }

  getCentralizadorAsignacionExcel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const payload = await this.buildCentralizadorAsignacionData(req.params['asignacion_id']!)
      const buf = generateCentralizadorAsignacionExcel(payload)
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      res.setHeader('Content-Disposition', `attachment; filename="centralizador_${payload.materia}.xlsx"`)
      res.send(buf)
    } catch (e) { next(e) }
  }

  getMia = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { trimestre_id } = req.query as Record<string, string>
      if (!trimestre_id) throw new AppError(400, 'trimestre_id es requerido', 'MISSING_PARAM')
      res.json({ data: await this.service.getMia(req.auth!.usuario_id, trimestre_id, req.auth!.institucion_id) })
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
          req.auth!.institucion_id,
        ),
      })
    } catch (e) { next(e) }
  }

  getCentralizadorAsignacion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.json({ data: await this.service.getCentralizadorAsignacion(req.params['asignacion_id']!) })
    } catch (e) { next(e) }
  }

  getParaStaff = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { trimestre_id } = req.query as Record<string, string>
      if (!trimestre_id) throw new AppError(400, 'trimestre_id es requerido', 'MISSING_PARAM')
      res.json({
        data: await this.service.getParaStaff(
          req.params['estudiante_id']!,
          trimestre_id,
          req.auth!.institucion_id,
        ),
      })
    } catch (e) { next(e) }
  }
}
