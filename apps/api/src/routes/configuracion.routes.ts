import { Router } from 'express'
import { ConfiguracionController } from '../controllers/configuracion.controller'
import { requireRol } from '../middlewares/requireRol'
import { Rol } from '@edusync/types'

export const configuracionRouter = Router()
const ctrl = new ConfiguracionController()

const canManage = requireRol(Rol.ADMIN_SISTEMA, Rol.DIRECTOR)

configuracionRouter.get('/',  ctrl.getConfig)
configuracionRouter.put('/',  canManage, ctrl.updateConfig)
