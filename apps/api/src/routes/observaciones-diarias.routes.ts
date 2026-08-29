import { Router } from 'express'
import { ObservacionesDiariasController } from '../controllers/observaciones-diarias.controller'
import { requireRol } from '../middlewares/requireRol'
import { Rol } from '@edusync/types'

export const observacionesDiariasRouter = Router()
const ctrl = new ObservacionesDiariasController()

const isDocente  = requireRol(Rol.DOCENTE)
const puedeVer   = requireRol(Rol.DIRECTOR, Rol.COORDINADOR, Rol.ADMIN_SISTEMA)

observacionesDiariasRouter.get('/paralelo/:paralelo_id', isDocente, ctrl.roster)
observacionesDiariasRouter.post('/',                     isDocente, ctrl.crear)
observacionesDiariasRouter.delete('/:id',                isDocente, ctrl.eliminar)

observacionesDiariasRouter.get('/mia',                   requireRol(Rol.ESTUDIANTE),  ctrl.getMia)
observacionesDiariasRouter.get('/hijo/:estudiante_id',    requireRol(Rol.PADRE_TUTOR), ctrl.getHijo)

observacionesDiariasRouter.get('/reporte',                puedeVer, ctrl.reporte)
observacionesDiariasRouter.get('/reporte/pdf',             puedeVer, ctrl.reportePdf)
