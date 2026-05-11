import type { Request, Response, NextFunction } from 'express'
import { PensionesService } from '../services/pensiones.service'
import { prisma } from '@edusync/database'
import type { Rol } from '@edusync/types'

export class PensionesController {
  private service = new PensionesService()

  generarMes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { gestion_id, mes } = req.body as { gestion_id: string; mes: number }
      const data = await this.service.generarMes(req.auth!.institucion_id, gestion_id, Number(mes))
      res.status(201).json({ data })
    } catch (e) { next(e) }
  }

  previewMes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { gestion_id, mes } = req.query as { gestion_id: string; mes: string }
      const data = await this.service.previewMes(req.auth!.institucion_id, gestion_id, Number(mes))
      res.json({ data })
    } catch (e) { next(e) }
  }

  findAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { gestion_id, mes, paralelo_id, nivel_id, estado, buscar, estudiante_id } = req.query as Record<string, string>

      // PADRE_TUTOR may only query their own children
      let filteredEstudianteId = estudiante_id
      if (req.auth!.rol === 'PADRE_TUTOR' && estudiante_id) {
        const rel = await prisma.relacionPadreHijo.findFirst({
          where: { padre_id: req.auth!.usuario_id, estudiante_id },
        })
        if (!rel) { res.status(403).json({ message: 'Sin acceso a este estudiante' }); return }
      }

      const data = await this.service.findAll(req.auth!.institucion_id, {
        ...(gestion_id          ? { gestion_id }                          : {}),
        ...(mes                 ? { mes: Number(mes) }                    : {}),
        ...(paralelo_id         ? { paralelo_id }                         : {}),
        ...(nivel_id            ? { nivel_id }                            : {}),
        ...(estado              ? { estado }                              : {}),
        ...(buscar              ? { buscar }                              : {}),
        ...(filteredEstudianteId ? { estudiante_id: filteredEstudianteId } : {}),
      })
      res.json({ data })
    } catch (e) { next(e) }
  }

  pagar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this.service.pagar(
        req.params['id']!,
        req.body as { fecha_pago: string; comprobante: string },
        req.auth!.usuario_id,
      )
      res.json({ data })
    } catch (e) { next(e) }
  }

  anular = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this.service.anular(req.params['id']!, req.auth!.usuario_id)
      res.json({ data })
    } catch (e) { next(e) }
  }

  estadoCuenta = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { gestion_id } = req.query as { gestion_id?: string }
      const data = await this.service.estadoCuenta(req.params['estudiante_id']!, gestion_id)
      res.json({ data })
    } catch (e) { next(e) }
  }

  morosidad = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { gestion_id, paralelo_id } = req.query as Record<string, string>
      const data = await this.service.morosidad(req.auth!.institucion_id, {
        ...(gestion_id  ? { gestion_id }  : {}),
        ...(paralelo_id ? { paralelo_id } : {}),
      })
      res.json({ data })
    } catch (e) { next(e) }
  }

  miEstadoFinanciero = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this.service.miEstadoFinanciero(
        req.auth!.usuario_id,
        req.auth!.institucion_id,
        req.auth!.rol as Rol,
      )
      res.json({ data })
    } catch (e) { next(e) }
  }
}
