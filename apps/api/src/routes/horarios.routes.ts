import { Router } from 'express'
import { HorariosController } from '../controllers/horarios.controller'
import { requireRol } from '../middlewares/requireRol'
import { Rol } from '@edusync/types'

export const horariosRouter = Router()
const ctrl = new HorariosController()

const isDocente = requireRol(Rol.DOCENTE)

horariosRouter.get('/mi-config',    isDocente, ctrl.getMiConfig)
horariosRouter.get('/mio',          isDocente, ctrl.getMio)
horariosRouter.get('/mio/pdf',      isDocente, ctrl.getMioPdf)
horariosRouter.get('/mio/excel',    isDocente, ctrl.getMioExcel)
horariosRouter.put('/celda',        isDocente, ctrl.guardarCelda)
horariosRouter.delete('/celda',     isDocente, ctrl.borrarCelda)
