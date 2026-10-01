import type { Request, Response, NextFunction } from 'express'
import type { CategoriaObservacion } from '@edusync/database'
import { ObservacionesDiariasService } from '../services/observaciones-diarias.service'
import { DocenteAlcanceService } from '../services/docenteAlcance.service'
import { AppError } from '../middlewares/errorHandler'
import { generarHTMLTablaSimple } from '../templates/reporte-tabla.template'
import { generatePDFLandscape } from '../utils/pdf.generator'

type ModoReporte = 'mes' | 'trimestre' | 'anno'

export class ObservacionesDiariasController {
  private service = new ObservacionesDiariasService()
  private alcance = new DocenteAlcanceService()

  roster = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.json({ data: await this.service.roster(req.auth!.usuario_id, req.params['paralelo_id']!) })
    } catch (e) { next(e) }
  }

  crear = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { estudiante_id, paralelo_id, asignacion_id, categoria, detalle, fecha } = req.body as {
        estudiante_id: string
        paralelo_id:   string
        asignacion_id?: string
        categoria:     CategoriaObservacion
        detalle?:      string
        fecha?:        string
      }
      const data = await this.service.crear(req.auth!.usuario_id, {
        estudiante_id, paralelo_id, asignacion_id, categoria, detalle, fecha,
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

  getParaEstudiante = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.json({ data: await this.service.getParaEstudiante(req.params['estudiante_id']!, req.auth!.institucion_id) })
    } catch (e) { next(e) }
  }

  private parseFiltroEstudiante(req: Request) {
    const { modo, mes, trimestre_id } = req.query as Record<string, string>
    if (!modo) throw new AppError(400, 'modo es requerido', 'MISSING_PARAM')
    return { modo: modo as 'mes' | 'trimestre' | 'total', mes, trimestre_id }
  }

  reportePorEstudiante = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const filtro = this.parseFiltroEstudiante(req)
      const data = await this.service.reportePorEstudiante(req.params['estudiante_id']!, req.auth!.institucion_id, filtro)
      res.json({ data })
    } catch (e) { next(e) }
  }

  reportePorEstudiantePdf = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const filtro = this.parseFiltroEstudiante(req)
      const data = await this.service.reportePorEstudiante(req.params['estudiante_id']!, req.auth!.institucion_id, filtro)
      const html = generarHTMLTablaSimple({
        titulo:    `Control Diario — ${data.estudiante}`,
        subtitulo: `${data.curso} · ${data.periodo}`,
        columnas: [
          { header: 'Fecha',       key: 'fecha' },
          { header: 'Materia',     key: 'materia' },
          { header: 'Observación', key: 'categoria' },
          { header: 'Detalle',     key: 'detalle' },
          { header: 'Docente',     key: 'docente' },
        ],
        filas: data.observaciones,
      })
      const pdf = await generatePDFLandscape(html)
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', `attachment; filename="control_diario_${data.codigo}.pdf"`)
      res.send(pdf)
    } catch (e) { next(e) }
  }

  // ── Reporte por estudiante, para el propio docente (acotado a sus cursos) ──

  miGetParaEstudiante = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const estudiante_id = req.params['estudiante_id']!
      const docente = await this.alcance.getDocente(req.auth!.usuario_id)
      await this.alcance.verificarAccesoEstudiante(docente.id, estudiante_id)
      res.json({ data: await this.service.getParaEstudiante(estudiante_id, req.auth!.institucion_id) })
    } catch (e) { next(e) }
  }

  miReportePorEstudiante = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const estudiante_id = req.params['estudiante_id']!
      const docente = await this.alcance.getDocente(req.auth!.usuario_id)
      await this.alcance.verificarAccesoEstudiante(docente.id, estudiante_id)
      const filtro = this.parseFiltroEstudiante(req)
      const data = await this.service.reportePorEstudiante(estudiante_id, req.auth!.institucion_id, filtro)
      res.json({ data })
    } catch (e) { next(e) }
  }

  miReportePorEstudiantePdf = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const estudiante_id = req.params['estudiante_id']!
      const docente = await this.alcance.getDocente(req.auth!.usuario_id)
      await this.alcance.verificarAccesoEstudiante(docente.id, estudiante_id)
      const filtro = this.parseFiltroEstudiante(req)
      const data = await this.service.reportePorEstudiante(estudiante_id, req.auth!.institucion_id, filtro)
      const html = generarHTMLTablaSimple({
        titulo:    `Control Diario — ${data.estudiante}`,
        subtitulo: `${data.curso} · ${data.periodo}`,
        columnas: [
          { header: 'Fecha',       key: 'fecha' },
          { header: 'Materia',     key: 'materia' },
          { header: 'Observación', key: 'categoria' },
          { header: 'Detalle',     key: 'detalle' },
          { header: 'Docente',     key: 'docente' },
        ],
        filas: data.observaciones,
      })
      const pdf = await generatePDFLandscape(html)
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', `attachment; filename="control_diario_${data.codigo}.pdf"`)
      res.send(pdf)
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

  reporteDocente = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { paralelo_id, filtro } = this.parseFiltro(req)
      const soloPropio = req.query['alcance'] !== 'todos'
      const data = await this.service.reporteDocente(
        req.auth!.usuario_id, paralelo_id, req.auth!.institucion_id, soloPropio, filtro,
      )
      res.json({ data })
    } catch (e) { next(e) }
  }

  reporteDocentePdf = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { paralelo_id, filtro } = this.parseFiltro(req)
      const soloPropio = req.query['alcance'] !== 'todos'
      const data = await this.service.reporteDocente(
        req.auth!.usuario_id, paralelo_id, req.auth!.institucion_id, soloPropio, filtro,
      )
      const html = generarHTMLTablaSimple({
        titulo:    `Control Diario — ${data.curso}`,
        subtitulo: `${data.periodo}${soloPropio ? ' — Mi materia' : ' — Todos los docentes'}`,
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
