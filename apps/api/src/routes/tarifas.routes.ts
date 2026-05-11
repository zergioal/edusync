import { Router, type Router as ExpressRouter } from 'express'
import { TarifasController } from '../controllers/tarifas.controller'
import { requireRol } from '../middlewares/requireRol'
import { Rol } from '@edusync/types'

export const tarifasRouter: ExpressRouter = Router()
const ctrl = new TarifasController()

tarifasRouter.get('/',  ctrl.findByGestion)
tarifasRouter.post('/', requireRol(Rol.DIRECTOR, Rol.ADMIN_SISTEMA, Rol.CONTADOR), ctrl.upsertBatch)
