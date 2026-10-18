import type { Request, Response, NextFunction } from 'express'
import { EstudiantesService } from '../services/estudiantes.service'
import { DocenteAlcanceService } from '../services/docenteAlcance.service'
import { Rol } from '@edusync/types'

export class EstudiantesController {
  private service  = new EstudiantesService()
  private alcance  = new DocenteAlcanceService()

  findAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { gestion_id, paralelo_id, buscar, estado } = req.query as Record<string, string | undefined>
      res.json({ data: await this.service.findAll(req.auth!.institucion_id, {
        ...(gestion_id  ? { gestion_id }  : {}),
        ...(paralelo_id ? { paralelo_id } : {}),
        ...(buscar      ? { buscar }      : {}),
        ...(estado      ? { estado }      : {}),
      }) })
    } catch (e) { next(e) }
  }

  findOne = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const estudiante_id = req.params['id']!
      // Docente: además de ser de su institución, el estudiante debe estar en uno de
      // sus propios cursos (institución sola no basta — ver DocenteAlcanceService).
      if (req.auth!.rol === Rol.DOCENTE) {
        const docente = await this.alcance.getDocente(req.auth!.usuario_id)
        await this.alcance.verificarAccesoEstudiante(docente.id, estudiante_id)
      }
      res.json({ data: await this.service.findOne(estudiante_id, req.auth!.institucion_id) })
    } catch (e) { next(e) }
  }

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.status(201).json({ data: await this.service.matricular(req.auth!.institucion_id, req.body) })
    } catch (e) { next(e) }
  }

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.json({ data: await this.service.update(req.params['id']!, req.body, req.auth!.usuario_id, req.auth!.institucion_id) })
    } catch (e) { next(e) }
  }

  // Docente: solo puede agregar/editar los teléfonos de referencia de sus propios
  // estudiantes (nunca borrarlos) — ver DocenteAlcanceService y el service para el detalle.
  updateTelefonosReferencia = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const estudiante_id = req.params['id']!
      const docente = await this.alcance.getDocente(req.auth!.usuario_id)
      await this.alcance.verificarAccesoEstudiante(docente.id, estudiante_id)
      res.json({ data: await this.service.updateTelefonosReferenciaDocente(estudiante_id, req.body) })
    } catch (e) { next(e) }
  }

  historialEstado = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.json({ data: await this.service.getHistorialEstado(req.params['id']!, req.auth!.institucion_id) })
    } catch (e) { next(e) }
  }

  remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.service.remove(req.params['id']!, req.auth!.institucion_id)
      res.status(204).send()
    } catch (e) { next(e) }
  }

  linkPadre = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.status(201).json({ data: await this.service.linkPadre(req.params['id']!, req.body, req.auth!.institucion_id) })
    } catch (e) { next(e) }
  }

  unlinkPadre = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.json({ data: await this.service.unlinkPadre(req.params['id']!, req.params['padreId']!, req.auth!.institucion_id) })
    } catch (e) { next(e) }
  }
}
