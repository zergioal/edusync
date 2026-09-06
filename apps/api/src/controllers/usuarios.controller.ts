import type { Request, Response, NextFunction } from 'express'
import { UsuariosService } from '../services/usuarios.service'

export class UsuariosController {
  private service = new UsuariosService()

  findAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { rol, buscar } = req.query as Record<string, string | undefined>
      const data = await this.service.findAll(req.auth!.institucion_id, {
        ...(rol    ? { rol }    : {}),
        ...(buscar ? { buscar } : {}),
      })
      res.json({ data })
    } catch (e) { next(e) }
  }

  me = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this.service.findBySupabaseId(req.auth!.supabase_uid)
      res.json({ data })
    } catch (e) { next(e) }
  }

  findOne = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this.service.findOne(req.params['id']!)
      res.json({ data })
    } catch (e) { next(e) }
  }

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this.service.create(req.auth!.institucion_id, req.body)
      res.status(201).json({ data })
    } catch (e) { next(e) }
  }

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this.service.update(req.params['id']!, req.body)
      res.json({ data })
    } catch (e) { next(e) }
  }

  updateMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Whitelist explícito — nunca pasar req.body completo aquí (evitaría que
      // un usuario se autoedite campos sensibles como rol o activo).
      const { nombre, apellido, grado_academico } = req.body as {
        nombre?: string; apellido?: string; grado_academico?: string | null
      }
      const data = await this.service.update(req.auth!.usuario_id, {
        ...(nombre           !== undefined ? { nombre }          : {}),
        ...(apellido         !== undefined ? { apellido }        : {}),
        ...(grado_academico  !== undefined ? { grado_academico } : {}),
      })
      res.json({ data })
    } catch (e) { next(e) }
  }

  remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.service.remove(req.params['id']!)
      res.status(204).send()
    } catch (e) { next(e) }
  }

  resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { password } = req.body as { password?: string }
      if (!password || password.length < 6) {
        res.status(400).json({ error: true, code: 'VALIDATION_ERROR', message: 'La contraseña debe tener al menos 6 caracteres' })
        return
      }
      const data = await this.service.resetPassword(req.params['id']!, password)
      res.json({ data })
    } catch (e) { next(e) }
  }
}
