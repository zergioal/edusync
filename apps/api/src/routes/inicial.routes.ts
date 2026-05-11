import { Router } from 'express'
import { InicialController } from '../controllers/inicial.controller'
import { requireRol } from '../middlewares/requireRol'
import { Rol } from '@edusync/types'

export const inicialRouter = Router()
const ctrl = new InicialController()

inicialRouter.get('/observaciones', ctrl.getObservaciones)
inicialRouter.put('/observaciones', requireRol(Rol.DOCENTE), ctrl.upsertObservaciones)
