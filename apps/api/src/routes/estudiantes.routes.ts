import { Router } from 'express'
import { EstudiantesController } from '../controllers/estudiantes.controller'
import { requireRol } from '../middlewares/requireRol'
import { Rol } from '@edusync/types'

export const estudiantesRouter = Router()
const ctrl = new EstudiantesController()

const canManage  = requireRol(Rol.ADMIN_SISTEMA, Rol.DIRECTOR, Rol.COORDINADOR, Rol.SECRETARIA)
const isDocente  = requireRol(Rol.DOCENTE)

estudiantesRouter.get('/',        ctrl.findAll)
estudiantesRouter.get('/:id',     ctrl.findOne)
estudiantesRouter.post('/',       ctrl.create)
estudiantesRouter.patch('/:id',   canManage, ctrl.update)
estudiantesRouter.patch('/:id/telefonos-referencia', isDocente, ctrl.updateTelefonosReferencia)
estudiantesRouter.delete('/:id',  canManage, ctrl.remove)
estudiantesRouter.post('/:id/padres',            canManage, ctrl.linkPadre)
estudiantesRouter.delete('/:id/padres/:padreId', canManage, ctrl.unlinkPadre)
estudiantesRouter.get('/:id/historial-estado',   canManage, ctrl.historialEstado)
