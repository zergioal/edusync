import { Router } from 'express'
import { NivelesController } from '../controllers/niveles.controller'

export const nivelesRouter = Router()
const ctrl = new NivelesController()

nivelesRouter.get('/', ctrl.findAll)
