import { Router } from 'express'
import { EstudiantesController } from '../controllers/estudiantes.controller'
import { requireRol } from '../middlewares/requireRol'
import { Rol } from '@edusync/types'

export const estudiantesRouter = Router()
const ctrl = new EstudiantesController()

const canManage  = requireRol(Rol.ADMIN_SISTEMA, Rol.DIRECTOR, Rol.COORDINADOR, Rol.SECRETARIA)
const isDocente  = requireRol(Rol.DOCENTE)
// Todo el personal con alguna razón legítima para ver un estudiante — incluye a
// quienes no pueden gestionar matrícula (Regente, Contador, Docente).
const canView    = requireRol(Rol.ADMIN_SISTEMA, Rol.DIRECTOR, Rol.COORDINADOR, Rol.SECRETARIA, Rol.REGENTE, Rol.CONTADOR, Rol.DOCENTE)

estudiantesRouter.get('/',        canView,   ctrl.findAll)
estudiantesRouter.get('/:id',     canView,   ctrl.findOne)
estudiantesRouter.post('/',       canManage, ctrl.create)
estudiantesRouter.patch('/:id',   canManage, ctrl.update)
estudiantesRouter.patch('/:id/telefonos-referencia', isDocente, ctrl.updateTelefonosReferencia)
estudiantesRouter.delete('/:id',  canManage, ctrl.remove)
estudiantesRouter.post('/:id/padres',            canManage, ctrl.linkPadre)
estudiantesRouter.delete('/:id/padres/:padreId', canManage, ctrl.unlinkPadre)
estudiantesRouter.get('/:id/historial-estado',   canManage, ctrl.historialEstado)
