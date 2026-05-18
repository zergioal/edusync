import { Router } from 'express'
import { PadresController } from '../controllers/padres.controller'
import { requireRol } from '../middlewares/requireRol'
import { Rol } from '@edusync/types'

export const padresRouter = Router()
const ctrl = new PadresController()

const canManage = requireRol(Rol.DIRECTOR, Rol.COORDINADOR, Rol.ADMIN_SISTEMA)

padresRouter.get('/',       canManage, ctrl.findAll)
padresRouter.get('/:id',    canManage, ctrl.findOne)
padresRouter.post('/',      canManage, ctrl.create)
padresRouter.put('/:id',    canManage, ctrl.update)
padresRouter.delete('/:id', canManage, ctrl.remove)
