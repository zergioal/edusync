import { Router } from 'express'
import { ParalelosController } from '../controllers/paralelos.controller'
import { requireRol } from '../middlewares/requireRol'
import { Rol } from '@edusync/types'

export const paralelosRouter = Router()
const ctrl = new ParalelosController()

const canManage = requireRol(Rol.COORDINADOR, Rol.DIRECTOR, Rol.ADMIN_SISTEMA)

paralelosRouter.get('/',     ctrl.findAll)
paralelosRouter.get('/:id',  ctrl.findOne)
paralelosRouter.post('/',    canManage, ctrl.create)
paralelosRouter.put('/:id',  canManage, ctrl.update)
paralelosRouter.delete('/:id', canManage, ctrl.deactivate)
