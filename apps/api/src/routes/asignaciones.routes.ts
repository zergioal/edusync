import { Router } from 'express'
import { AsignacionesController } from '../controllers/asignaciones.controller'
import { requireRol } from '../middlewares/requireRol'
import { Rol } from '@edusync/types'

export const asignacionesRouter = Router()
const ctrl = new AsignacionesController()

const canManage = requireRol(Rol.COORDINADOR, Rol.DIRECTOR, Rol.ADMIN_SISTEMA)

asignacionesRouter.get('/mias',   requireRol(Rol.DOCENTE), ctrl.findMias)
asignacionesRouter.get('/:id',    ctrl.findOne)
asignacionesRouter.get('/',       canManage, ctrl.findAll)
asignacionesRouter.post('/',      canManage, ctrl.create)
asignacionesRouter.delete('/:id', canManage, ctrl.remove)
