import type { Request, Response, NextFunction } from 'express'
import { DocumentosService, TIPOS_DOCUMENTO } from '../services/documentos.service'
import { AppError } from '../middlewares/errorHandler'
import { generarHTMLTablaSimple, type DatosTablaSimple } from '../templates/reporte-tabla.template'
import { generatePDFLandscape } from '../utils/pdf.generator'
import { generateTablaSimpleExcel } from '../utils/excel.generator'
import { getInstitucionInfo } from '../utils/institucion.util'

export class DocumentosController {
  private service = new DocumentosService()

  tipos = (_req: Request, res: Response): void => {
    res.json({ data: TIPOS_DOCUMENTO })
  }

  getChecklist = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.json({ data: await this.service.getChecklist(req.params['estudiante_id']!) })
    } catch (e) { next(e) }
  }

  toggle = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tipo, entregado, observacion } = req.body as { tipo: string; entregado: boolean; observacion?: string }
      if (!tipo || typeof entregado !== 'boolean') {
        throw new AppError(400, 'tipo y entregado son requeridos', 'MISSING_PARAM')
      }
      res.json({ data: await this.service.toggle(req.params['estudiante_id']!, tipo, entregado, observacion) })
    } catch (e) { next(e) }
  }

  reportePendientes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { gestion_id, paralelo_id } = req.query as Record<string, string>
      if (!gestion_id) throw new AppError(400, 'gestion_id es requerido', 'MISSING_PARAM')
      res.json({ data: await this.service.getReportePendientes(gestion_id, paralelo_id) })
    } catch (e) { next(e) }
  }

  private async reportePendientesTabla(req: Request): Promise<DatosTablaSimple> {
    const { gestion_id, paralelo_id } = req.query as Record<string, string>
    if (!gestion_id) throw new AppError(400, 'gestion_id es requerido', 'MISSING_PARAM')
    const [data, institucion] = await Promise.all([
      this.service.getReportePendientes(gestion_id, paralelo_id),
      getInstitucionInfo(req.auth!.institucion_id),
    ])
    return {
      institucion,
      titulo:    'Documentación Pendiente',
      subtitulo: `${data.estudiantes.length} estudiante(s) con expediente incompleto`,
      columnas: [
        { header: 'Código',            key: 'codigo' },
        { header: 'Apellido',          key: 'apellido' },
        { header: 'Nombre',            key: 'nombre' },
        { header: 'Nivel',             key: 'nivel' },
        { header: 'Grado',             key: 'grado' },
        { header: 'Paralelo',          key: 'paralelo', align: 'center' },
        { header: 'Documentos faltantes', key: 'faltantes' },
      ],
      filas: data.estudiantes.map(e => ({
        codigo:   e.codigo,
        apellido: e.apellido,
        nombre:   e.nombre,
        nivel:    e.nivel,
        grado:    e.grado,
        paralelo: e.paralelo,
        faltantes: e.pendientes.join(', '),
      })),
    }
  }

  reportePendientesPdf = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tabla = await this.reportePendientesTabla(req)
      const pdf = await generatePDFLandscape(generarHTMLTablaSimple(tabla))
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', 'attachment; filename="documentacion_pendiente.pdf"')
      res.send(pdf)
    } catch (e) { next(e) }
  }

  reportePendientesExcel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tabla = await this.reportePendientesTabla(req)
      const buf = generateTablaSimpleExcel(tabla)
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      res.setHeader('Content-Disposition', 'attachment; filename="documentacion_pendiente.xlsx"')
      res.send(buf)
    } catch (e) { next(e) }
  }
}
