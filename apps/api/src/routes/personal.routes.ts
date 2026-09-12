import { Router } from 'express'
import { PersonalController } from '../controllers/personal.controller'
import { requireRol } from '../middlewares/requireRol'
import { Rol } from '@edusync/types'

export const personalRouter = Router()
const ctrl = new PersonalController()

const canManage = requireRol(Rol.ADMIN_SISTEMA, Rol.DIRECTOR)
const canDelete = requireRol(Rol.ADMIN_SISTEMA)

personalRouter.get('/',       canManage, ctrl.findAll)
personalRouter.post('/',      canManage, ctrl.create)
personalRouter.patch('/:id',  canManage, ctrl.update)
personalRouter.delete('/:id', canDelete, ctrl.remove)
