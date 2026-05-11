import { Router } from 'express'
import { GradosController } from '../controllers/grados.controller'

export const gradosRouter = Router()
const ctrl = new GradosController()

gradosRouter.get('/', ctrl.findAll)
