import { Router } from 'express'
import { InstitucionesController } from '../controllers/instituciones.controller'
import { requireRol } from '../middlewares/requireRol'
import { Rol } from '@edusync/types'

export const institucionesRouter = Router()
const ctrl = new InstitucionesController()

institucionesRouter.get('/',    requireRol(Rol.ADMIN_SISTEMA), ctrl.findAll)
institucionesRouter.get('/:id', ctrl.findOne)
institucionesRouter.post('/',   requireRol(Rol.ADMIN_SISTEMA), ctrl.create)
institucionesRouter.patch('/:id', requireRol(Rol.ADMIN_SISTEMA, Rol.DIRECTOR), ctrl.update)
