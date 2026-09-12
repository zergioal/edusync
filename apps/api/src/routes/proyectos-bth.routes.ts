import { Router } from 'express'
import { ProyectosBTHController } from '../controllers/proyectos-bth.controller'
import { requireRol } from '../middlewares/requireRol'
import { checkAccesoBTH } from '../middlewares/checkAccesoBTH'
import { Rol } from '@edusync/types'

export const proyectosBTHRouter = Router()
const ctrl = new ProyectosBTHController()

const canManage = requireRol(Rol.COORDINADOR, Rol.DIRECTOR, Rol.ADMIN_SISTEMA)

proyectosBTHRouter.get('/mi-proyecto',            requireRol(Rol.ESTUDIANTE),  ctrl.miProyecto)
proyectosBTHRouter.get('/hijo/:estudiante_id',    requireRol(Rol.PADRE_TUTOR), ctrl.proyectoDeHijo)

proyectosBTHRouter.get('/',       canManage, checkAccesoBTH, ctrl.findAll)
proyectosBTHRouter.post('/',      canManage, checkAccesoBTH, ctrl.create)
proyectosBTHRouter.patch('/:id',  canManage, checkAccesoBTH, ctrl.update)
proyectosBTHRouter.delete('/:id', canManage, checkAccesoBTH, ctrl.remove)
