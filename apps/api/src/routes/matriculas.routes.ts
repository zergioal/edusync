import { Router } from 'express'
import { MatriculasController } from '../controllers/matriculas.controller'

export const matriculasRouter = Router()
const ctrl = new MatriculasController()

matriculasRouter.get('/',  ctrl.findAll)
matriculasRouter.post('/', ctrl.create)
