import type { Request, Response, NextFunction } from 'express'
import { CertificadosService, TIPOS_CERTIFICADO } from '../services/certificados.service'
import { AppError } from '../middlewares/errorHandler'
import { generarHTMLTablaSimple, type DatosTablaSimple } from '../templates/reporte-tabla.template'
import { generatePDFLandscape } from '../utils/pdf.generator'
import { generateTablaSimpleExcel } from '../utils/excel.generator'
import { getInstitucionInfo } from '../utils/institucion.util'

export class CertificadosController {
  private service = new CertificadosService()

  tipos = (_req: Request, res: Response): void => {
    res.json({ data: TIPOS_CERTIFICADO })
  }

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { estudiante_id, tipo, tipo_otro, observacion } = req.body as {
        estudiante_id: string; tipo: string; tipo_otro?: string; observacion?: string
      }
      if (!estudiante_id || !tipo) throw new AppError(400, 'estudiante_id y tipo son requeridos', 'MISSING_PARAM')
      res.status(201).json({
        data: await this.service.create({
          estudiante_id, tipo,
          ...(tipo_otro ? { tipo_otro } : {}),
          ...(observacion ? { observacion } : {}),
          emitido_por_id: req.auth!.usuario_id,
        }),
      })
    } catch (e) { next(e) }
  }

  listByEstudiante = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.json({ data: await this.service.listByEstudiante(req.params['estudiante_id']!) })
    } catch (e) { next(e) }
  }

  remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.service.remove(req.params['id']!)
      res.status(204).send()
    } catch (e) { next(e) }
  }

  listGlobal = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tipo, desde, hasta } = req.query as Record<string, string>
      res.json({
        data: await this.service.listGlobal({
          institucion_id: req.auth!.institucion_id,
          ...(tipo  ? { tipo }  : {}),
          ...(desde ? { desde } : {}),
          ...(hasta ? { hasta } : {}),
        }),
      })
    } catch (e) { next(e) }
  }

  private async listGlobalTabla(req: Request): Promise<DatosTablaSimple> {
    const { tipo, desde, hasta } = req.query as Record<string, string>
    const [certificados, institucion] = await Promise.all([
      this.service.listGlobal({
        institucion_id: req.auth!.institucion_id,
        ...(tipo  ? { tipo }  : {}),
        ...(desde ? { desde } : {}),
        ...(hasta ? { hasta } : {}),
      }),
      getInstitucionInfo(req.auth!.institucion_id),
    ])
    return {
      institucion,
      titulo:    'Certificados y Trámites Emitidos',
      subtitulo: `${certificados.length} certificado(s) emitido(s)`,
      columnas: [
        { header: 'Fecha',        key: 'fecha' },
        { header: 'Tipo',         key: 'tipo' },
        { header: 'Estudiante',   key: 'estudiante' },
        { header: 'Código',       key: 'codigo' },
        { header: 'Emitido por',  key: 'emitido_por' },
        { header: 'Observación',  key: 'observacion' },
      ],
      filas: certificados.map(c => ({
        fecha:       new Date(c.fecha_emision).toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        tipo:        c.tipo,
        estudiante:  c.estudiante,
        codigo:      c.codigo,
        emitido_por: c.emitido_por,
        observacion: c.observacion ?? '',
      })),
    }
  }

  listGlobalPdf = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tabla = await this.listGlobalTabla(req)
      const pdf = await generatePDFLandscape(generarHTMLTablaSimple(tabla))
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', 'attachment; filename="certificados_emitidos.pdf"')
      res.send(pdf)
    } catch (e) { next(e) }
  }

  listGlobalExcel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tabla = await this.listGlobalTabla(req)
      const buf = generateTablaSimpleExcel(tabla)
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      res.setHeader('Content-Disposition', 'attachment; filename="certificados_emitidos.xlsx"')
      res.send(buf)
    } catch (e) { next(e) }
  }
}
