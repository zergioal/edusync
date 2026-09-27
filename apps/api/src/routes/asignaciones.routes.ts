import { Router } from 'express'
import { AsignacionesController } from '../controllers/asignaciones.controller'
import { requireRol } from '../middlewares/requireRol'
import { Rol } from '@edusync/types'

export const asignacionesRouter = Router()
const ctrl = new AsignacionesController()

const canManage = requireRol(Rol.COORDINADOR, Rol.DIRECTOR, Rol.ADMIN_SISTEMA)
// Secretaría necesita ver la lista de asignaciones (ej. para elegir materia en Nota Extracurricular
// y en el listado de Docentes), pero no puede crear/eliminar asignaciones ni asignar horas.
const canView = requireRol(Rol.COORDINADOR, Rol.DIRECTOR, Rol.ADMIN_SISTEMA, Rol.SECRETARIA)

asignacionesRouter.get('/mias',              requireRol(Rol.DOCENTE), ctrl.findMias)
asignacionesRouter.get('/mis-cursos-asesor', requireRol(Rol.DOCENTE), ctrl.misCursosAsesor)
asignacionesRouter.get('/:id',    ctrl.findOne)
asignacionesRouter.get('/',       canView, ctrl.findAll)
asignacionesRouter.post('/',      canManage, ctrl.create)
asignacionesRouter.delete('/:id', canManage, ctrl.remove)
