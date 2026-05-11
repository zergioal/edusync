import { Router } from 'express'
import { EstudiantesController } from '../controllers/estudiantes.controller'

export const estudiantesRouter = Router()
const ctrl = new EstudiantesController()

estudiantesRouter.get('/',     ctrl.findAll)
estudiantesRouter.get('/:id',  ctrl.findOne)
estudiantesRouter.post('/',    ctrl.create)
estudiantesRouter.patch('/:id', ctrl.update)
