import { Router } from 'express'
import { TrimestresesController } from '../controllers/trimestres.controller'
import { requireRol } from '../middlewares/requireRol'
import { Rol } from '@edusync/types'

export const trimestresRouter = Router()
const ctrl = new TrimestresesController()

const canCerrar = requireRol(Rol.ADMIN_SISTEMA, Rol.DIRECTOR, Rol.COORDINADOR)

trimestresRouter.get('/',              ctrl.findAll)
trimestresRouter.put('/:id',           ctrl.update)
trimestresRouter.put('/:id/cerrar',    canCerrar, ctrl.cerrar)
