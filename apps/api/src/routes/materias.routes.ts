import { Router } from 'express'
import { MateriasController } from '../controllers/materias.controller'
import { requireRol } from '../middlewares/requireRol'
import { Rol } from '@edusync/types'

export const materiasRouter = Router()
const ctrl = new MateriasController()

const canManage = requireRol(Rol.ADMIN_SISTEMA, Rol.DIRECTOR, Rol.COORDINADOR, Rol.REGENTE)

materiasRouter.get('/',              ctrl.findAll)
materiasRouter.get('/disponibles',   ctrl.findDisponibles)
materiasRouter.get('/carga-horaria', ctrl.findCargaHoraria)
materiasRouter.put('/carga-horaria', canManage, ctrl.updateCargaHoraria)
