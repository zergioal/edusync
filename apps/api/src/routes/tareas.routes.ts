import { Router } from 'express'
import { TareasController } from '../controllers/comunicacion.controller'
import { requireRol } from '../middlewares/requireRol'
import { Rol } from '@edusync/types'

export const tareasRouter = Router()
const ctrl = new TareasController()

tareasRouter.get('/mis-tareas',  requireRol(Rol.ESTUDIANTE), ctrl.findEstudiante)
tareasRouter.get('/',            requireRol(Rol.DOCENTE),    ctrl.findMias)
tareasRouter.post('/',           requireRol(Rol.DOCENTE),    ctrl.create)
tareasRouter.put('/:id',         requireRol(Rol.DOCENTE),    ctrl.update)
tareasRouter.delete('/:id',      requireRol(Rol.DOCENTE),    ctrl.remove)
