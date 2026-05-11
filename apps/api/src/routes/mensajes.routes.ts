import { Router } from 'express'
import { MensajesController } from '../controllers/comunicacion.controller'

export const mensajesRouter = Router()
const ctrl = new MensajesController()

mensajesRouter.get('/bandeja', ctrl.getBandeja)
mensajesRouter.get('/:id',     ctrl.getOne)
mensajesRouter.post('/',       ctrl.create)
