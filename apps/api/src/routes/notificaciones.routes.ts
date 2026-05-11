import { Router } from 'express'
import { NotificacionesController } from '../controllers/comunicacion.controller'

export const notificacionesRouter = Router()
const ctrl = new NotificacionesController()

notificacionesRouter.get('/',               ctrl.findAll)
notificacionesRouter.get('/count',          ctrl.contarNoLeidas)
notificacionesRouter.put('/leer-todas',     ctrl.marcarTodasLeidas)
notificacionesRouter.put('/:id/leer',       ctrl.marcarLeida)
