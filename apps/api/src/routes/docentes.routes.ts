import { Router } from 'express'
import { DocentesController } from '../controllers/docentes.controller'
import { requireRol } from '../middlewares/requireRol'
import { Rol } from '@edusync/types'

export const docentesRouter = Router()
const ctrl = new DocentesController()

const canManage = requireRol(Rol.DIRECTOR, Rol.COORDINADOR, Rol.REGENTE, Rol.ADMIN_SISTEMA)

docentesRouter.get('/',        ctrl.findAll)
docentesRouter.get('/:id',     ctrl.findOne)
docentesRouter.post('/',       canManage, ctrl.create)
docentesRouter.put('/:id',     canManage, ctrl.update)
docentesRouter.delete('/:id',  canManage, ctrl.remove)
