import type { Request, Response, NextFunction } from 'express'
import type { EstadoEstudiante } from '@edusync/types'
import { ReportesService } from '../services/reportes.service'
import { AppError }        from '../middlewares/errorHandler'
import { generarHTMLCentralizador } from '../templates/centralizador.template'
import { generarHTMLCuadroHonor }   from '../templates/cuadro-honor.template'
import { generarHTMLTablaSimple, type DatosTablaSimple } from '../templates/reporte-tabla.template'
import { generarHTMLFichaEstudiante } from '../templates/ficha-estudiante.template'
import { generatePDF, generatePDFLandscape } from '../utils/pdf.generator'
import { generateCentralizadorExcel, generateTablaSimpleExcel } from '../utils/excel.generator'
import { getInstitucionInfo } from '../utils/institucion.util'

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

  // ── Reportes de Secretaría ───────────────────────────────────────────────

  private sendPdf(res: Response, tabla: DatosTablaSimple, filename: string) {
    return generatePDFLandscape(generarHTMLTablaSimple(tabla)).then(pdf => {
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`)
      res.send(pdf)
    })
  }

  private sendExcel(res: Response, tabla: DatosTablaSimple, filename: string) {
    const buf = generateTablaSimpleExcel(tabla)
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`)
    res.send(buf)
  }

  // Nómina de estudiantes ------------------------------------------------------

  private async nominaTabla(req: Request): Promise<DatosTablaSimple> {
    const { gestion_id, nivel_id, grado_id, paralelo_id } = req.query as Record<string, string>
    if (!gestion_id) throw new AppError(400, 'gestion_id es requerido', 'MISSING_PARAM')
    const [data, institucion] = await Promise.all([
      this.service.getNomina(req.auth!.institucion_id, gestion_id, nivel_id, grado_id, paralelo_id),
      getInstitucionInfo(req.auth!.institucion_id),
    ])
    return {
      institucion,
      titulo:    'Nómina de Estudiantes Inscritos',
      subtitulo: `Gestión ${data.anno} — ${data.estudiantes.length} estudiante(s)`,
      columnas: [
        { header: 'Código',   key: 'codigo' },
        { header: 'Apellido', key: 'apellido' },
        { header: 'Nombre',   key: 'nombre' },
        { header: 'Nivel',    key: 'nivel' },
        { header: 'Grado',    key: 'grado' },
        { header: 'Paralelo', key: 'paralelo', align: 'center' },
        { header: 'Estado',   key: 'estado', align: 'center' },
      ],
      filas: data.estudiantes,
    }
  }

  nomina = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { gestion_id, nivel_id, grado_id, paralelo_id } = req.query as Record<string, string>
      if (!gestion_id) throw new AppError(400, 'gestion_id es requerido', 'MISSING_PARAM')
      res.json({ data: await this.service.getNomina(req.auth!.institucion_id, gestion_id, nivel_id, grado_id, paralelo_id) })
    } catch (e) { next(e) }
  }
  nominaPdf = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { await this.sendPdf(res, await this.nominaTabla(req), 'nomina_estudiantes') } catch (e) { next(e) }
  }
  nominaExcel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { this.sendExcel(res, await this.nominaTabla(req), 'nomina_estudiantes') } catch (e) { next(e) }
  }

  // Ficha individual ------------------------------------------------------------

  fichaEstudiante = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.json({ data: await this.service.getFichaEstudiante(req.params['estudiante_id']!, req.auth!.institucion_id) })
    } catch (e) { next(e) }
  }
  fichaEstudiantePdf = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const [data, institucion] = await Promise.all([
        this.service.getFichaEstudiante(req.params['estudiante_id']!, req.auth!.institucion_id),
        getInstitucionInfo(req.auth!.institucion_id),
      ])
      const pdf = await generatePDF(generarHTMLFichaEstudiante({ ...data, institucion }))
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', `attachment; filename="ficha_${data.datos_personales.codigo}.pdf"`)
      res.send(pdf)
    } catch (e) { next(e) }
  }

  // Estado de matrícula (activos/retirados/trasladados) -------------------------

  private async estadoMatriculaTabla(req: Request): Promise<DatosTablaSimple> {
    const { gestion_id, estado } = req.query as Record<string, string>
    if (!gestion_id) throw new AppError(400, 'gestion_id es requerido', 'MISSING_PARAM')
    const [data, institucion] = await Promise.all([
      this.service.getEstudiantesPorEstado(req.auth!.institucion_id, gestion_id, estado as EstadoEstudiante | undefined),
      getInstitucionInfo(req.auth!.institucion_id),
    ])
    return {
      institucion,
      titulo:    'Estudiantes por Estado de Matrícula',
      subtitulo: `Activos: ${data.resumen.ACTIVO} · Retirados: ${data.resumen.RETIRADO} · Trasladados: ${data.resumen.TRASLADADO}`,
      columnas: [
        { header: 'Código',   key: 'codigo' },
        { header: 'Apellido', key: 'apellido' },
        { header: 'Nombre',   key: 'nombre' },
        { header: 'Nivel',    key: 'nivel' },
        { header: 'Grado',    key: 'grado' },
        { header: 'Paralelo', key: 'paralelo', align: 'center' },
        { header: 'Estado',   key: 'estado', align: 'center' },
      ],
      filas: data.estudiantes,
    }
  }

  estadoMatricula = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { gestion_id, estado } = req.query as Record<string, string>
      if (!gestion_id) throw new AppError(400, 'gestion_id es requerido', 'MISSING_PARAM')
      res.json({ data: await this.service.getEstudiantesPorEstado(req.auth!.institucion_id, gestion_id, estado as EstadoEstudiante | undefined) })
    } catch (e) { next(e) }
  }
  estadoMatriculaPdf = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { await this.sendPdf(res, await this.estadoMatriculaTabla(req), 'estado_matricula') } catch (e) { next(e) }
  }
  estadoMatriculaExcel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { this.sendExcel(res, await this.estadoMatriculaTabla(req), 'estado_matricula') } catch (e) { next(e) }
  }

  // Estadística de matrícula -----------------------------------------------------

  estadisticaMatricula = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { gestion_id } = req.query as Record<string, string>
      if (!gestion_id) throw new AppError(400, 'gestion_id es requerido', 'MISSING_PARAM')
      res.json({ data: await this.service.getEstadisticaMatricula(req.auth!.institucion_id, gestion_id) })
    } catch (e) { next(e) }
  }

  private async estadisticaMatriculaTabla(req: Request): Promise<DatosTablaSimple> {
    const { gestion_id } = req.query as Record<string, string>
    if (!gestion_id) throw new AppError(400, 'gestion_id es requerido', 'MISSING_PARAM')
    const [data, institucion] = await Promise.all([
      this.service.getEstadisticaMatricula(req.auth!.institucion_id, gestion_id),
      getInstitucionInfo(req.auth!.institucion_id),
    ])
    return {
      institucion,
      titulo:    'Estadística de Matrícula por Grado y Paralelo',
      subtitulo: `Gestión ${data.anno} — Total: ${data.total} · M: ${data.por_sexo['M'] ?? 0} · F: ${data.por_sexo['F'] ?? 0} · Sin registrar: ${data.por_sexo['Sin registrar'] ?? 0}`,
      columnas: [
        { header: 'Nivel',    key: 'nivel' },
        { header: 'Grado',    key: 'grado' },
        { header: 'Paralelo', key: 'paralelo', align: 'center' },
        { header: 'Total',    key: 'total', align: 'center' },
      ],
      filas: data.por_grado_paralelo,
    }
  }
  estadisticaMatriculaPdf = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { await this.sendPdf(res, await this.estadisticaMatriculaTabla(req), 'estadistica_matricula') } catch (e) { next(e) }
  }
  estadisticaMatriculaExcel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { this.sendExcel(res, await this.estadisticaMatriculaTabla(req), 'estadistica_matricula') } catch (e) { next(e) }
  }

  // Padres / tutores --------------------------------------------------------------

  private async padresTutoresTabla(req: Request): Promise<DatosTablaSimple> {
    const { gestion_id, paralelo_id } = req.query as Record<string, string>
    if (!gestion_id) throw new AppError(400, 'gestion_id es requerido', 'MISSING_PARAM')
    const [filas, institucion] = await Promise.all([
      this.service.getPadresTutores(req.auth!.institucion_id, gestion_id, paralelo_id),
      getInstitucionInfo(req.auth!.institucion_id),
    ])
    return {
      institucion,
      titulo:   'Padres, Madres y Tutores',
      subtitulo: `${filas.length} registro(s)`,
      columnas: [
        { header: 'Estudiante', key: 'estudiante' },
        { header: 'Código',     key: 'codigo' },
        { header: 'Nivel',      key: 'nivel' },
        { header: 'Grado',      key: 'grado' },
        { header: 'Paralelo',   key: 'paralelo', align: 'center' },
        { header: 'Tutor',      key: 'tutor' },
        { header: 'Correo',     key: 'email' },
        { header: 'Teléfono',   key: 'telefono' },
      ],
      filas,
    }
  }

  padresTutores = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { gestion_id, paralelo_id } = req.query as Record<string, string>
      if (!gestion_id) throw new AppError(400, 'gestion_id es requerido', 'MISSING_PARAM')
      res.json({ data: await this.service.getPadresTutores(req.auth!.institucion_id, gestion_id, paralelo_id) })
    } catch (e) { next(e) }
  }
  padresTutoresPdf = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { await this.sendPdf(res, await this.padresTutoresTabla(req), 'padres_tutores') } catch (e) { next(e) }
  }
  padresTutoresExcel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { this.sendExcel(res, await this.padresTutoresTabla(req), 'padres_tutores') } catch (e) { next(e) }
  }
}
