import type { Request, Response, NextFunction } from 'express'
import { prisma } from '@edusync/database'
import { Rol } from '@edusync/types'
import { BoletinesService } from '../services/boletines.service'
import { AppError }         from '../middlewares/errorHandler'
import { generarHTMLBoletin } from '../templates/boletin.template'
import { generatePDF }        from '../utils/pdf.generator'

export class BoletinesController {
  private service = new BoletinesService()

  private async checkAcceso(
    req:           Request,
    estudiante_id: string,
  ): Promise<void> {
    const auth = req.auth!
    if (auth.rol === Rol.ESTUDIANTE) {
      const est = await prisma.estudiante.findFirst({ where: { usuario_id: auth.usuario_id } })
      if (!est || est.id !== estudiante_id) {
        throw new AppError(403, 'Sin acceso a este boletín', 'FORBIDDEN')
      }
    } else if (auth.rol === Rol.PADRE_TUTOR) {
      const rel = await prisma.relacionPadreHijo.findFirst({
        where: { padre_id: auth.usuario_id, estudiante_id },
      })
      if (!rel) throw new AppError(403, 'Sin acceso a este boletín', 'FORBIDDEN')
    }
  }

  getBoletin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { estudiante_id } = req.params
      const { trimestre_id }  = req.query as Record<string, string>
      if (!trimestre_id) throw new AppError(400, 'trimestre_id es requerido', 'MISSING_PARAM')

      await this.checkAcceso(req, estudiante_id!)
      const data = await this.service.getBoletin(estudiante_id!, trimestre_id, req.auth!.institucion_id)
      res.json({ data })
    } catch (e) { next(e) }
  }

  getBoletinPdf = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { estudiante_id } = req.params
      const { trimestre_id }  = req.query as Record<string, string>
      if (!trimestre_id) throw new AppError(400, 'trimestre_id es requerido', 'MISSING_PARAM')

      await this.checkAcceso(req, estudiante_id!)
      const data = await this.service.getBoletin(estudiante_id!, trimestre_id, req.auth!.institucion_id)
      const html = generarHTMLBoletin(data)
      const pdf  = await generatePDF(html)

      const nombre = `${data.estudiante.apellido}_${data.estudiante.nombre}`.replace(/\s+/g, '_')
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', `attachment; filename="boletin_${nombre}_T${data.trimestre.numero}.pdf"`)
      res.send(pdf)
    } catch (e) { next(e) }
  }
}
