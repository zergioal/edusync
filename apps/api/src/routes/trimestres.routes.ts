import { Router } from 'express'
import { TrimestresesController } from '../controllers/trimestres.controller'

export const trimestresRouter = Router()
const ctrl = new TrimestresesController()

trimestresRouter.get('/',              ctrl.findAll)
trimestresRouter.put('/:id',           ctrl.update)
trimestresRouter.put('/:id/cerrar',    ctrl.cerrar)
