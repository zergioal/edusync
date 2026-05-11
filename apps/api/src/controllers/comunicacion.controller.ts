import type { Request, Response, NextFunction } from 'express'
import { AnunciosService, TareasService, MensajesService, NotificacionesService } from '../services/comunicacion.service'

const anunciosSvc       = new AnunciosService()
const tareasSvc         = new TareasService()
const mensajesSvc       = new MensajesService()
const notificacionesSvc = new NotificacionesService()

// ─── Anuncios ─────────────────────────────────────────────────────────────────

export class AnunciosController {
  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await anunciosSvc.create(req.auth!.institucion_id, req.auth!.usuario_id, req.body)
      res.status(201).json({ data })
    } catch (e) { next(e) }
  }

  findAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { visible_para, paralelo_id } = req.query as Record<string, string>
      const data = await anunciosSvc.findAll(req.auth!.institucion_id, {
        ...(visible_para ? { visible_para } : {}),
        ...(paralelo_id  ? { paralelo_id }  : {}),
      })
      res.json({ data })
    } catch (e) { next(e) }
  }

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await anunciosSvc.update(req.params['id']!, req.auth!.institucion_id, req.body)
      res.json({ data })
    } catch (e) { next(e) }
  }

  remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await anunciosSvc.remove(req.params['id']!, req.auth!.institucion_id)
      res.status(204).end()
    } catch (e) { next(e) }
  }
}

// ─── Tareas ───────────────────────────────────────────────────────────────────

export class TareasController {
  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await tareasSvc.create(req.auth!.usuario_id, req.body)
      res.status(201).json({ data })
    } catch (e) { next(e) }
  }

  findMias = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { asignacion_id } = req.query as Record<string, string>
      const data = await tareasSvc.findByDocente(req.auth!.usuario_id, {
        ...(asignacion_id ? { asignacion_id } : {}),
      })
      res.json({ data })
    } catch (e) { next(e) }
  }

  findEstudiante = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await tareasSvc.findByEstudiante(req.auth!.usuario_id)
      res.json({ data })
    } catch (e) { next(e) }
  }

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await tareasSvc.update(req.params['id']!, req.auth!.usuario_id, req.body)
      res.json({ data })
    } catch (e) { next(e) }
  }

  remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await tareasSvc.remove(req.params['id']!, req.auth!.usuario_id)
      res.status(204).end()
    } catch (e) { next(e) }
  }
}

// ─── Mensajes ─────────────────────────────────────────────────────────────────

export class MensajesController {
  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await mensajesSvc.create(req.auth!.usuario_id, req.body)
      res.status(201).json({ data })
    } catch (e) { next(e) }
  }

  getBandeja = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await mensajesSvc.getBandeja(req.auth!.usuario_id)
      res.json({ data })
    } catch (e) { next(e) }
  }

  getOne = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await mensajesSvc.getOne(req.params['id']!, req.auth!.usuario_id)
      res.json({ data })
    } catch (e) { next(e) }
  }
}

// ─── Notificaciones ──────────────────────────────────────────────────────────

export class NotificacionesController {
  findAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { solo_no_leidas, page } = req.query as Record<string, string>
      const data = await notificacionesSvc.findAll(req.auth!.usuario_id, {
        solo_no_leidas: solo_no_leidas === 'true',
        page: page ? Number(page) : 1,
      })
      res.json({ data })
    } catch (e) { next(e) }
  }

  marcarLeida = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await notificacionesSvc.marcarLeida(req.params['id']!, req.auth!.usuario_id)
      res.json({ data })
    } catch (e) { next(e) }
  }

  marcarTodasLeidas = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await notificacionesSvc.marcarTodasLeidas(req.auth!.usuario_id)
      res.status(204).end()
    } catch (e) { next(e) }
  }

  contarNoLeidas = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const count = await notificacionesSvc.contarNoLeidas(req.auth!.usuario_id)
      res.json({ data: { count } })
    } catch (e) { next(e) }
  }
}
