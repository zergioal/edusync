import { Router } from 'express'
import { AnunciosController } from '../controllers/comunicacion.controller'
import { requireRol } from '../middlewares/requireRol'
import { Rol } from '@edusync/types'

export const anunciosRouter = Router()
const ctrl = new AnunciosController()

const canPublish = requireRol(Rol.DIRECTOR, Rol.COORDINADOR, Rol.SECRETARIA, Rol.REGENTE, Rol.DOCENTE, Rol.ADMIN_SISTEMA)

anunciosRouter.get('/',       ctrl.findAll)
anunciosRouter.post('/',      canPublish, ctrl.create)
anunciosRouter.put('/:id',    canPublish, ctrl.update)
anunciosRouter.delete('/:id', canPublish, ctrl.remove)
