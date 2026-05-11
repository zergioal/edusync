import { Router } from 'express'
import { PlanillaController } from '../controllers/planilla.controller'

export const planillaRouter = Router()
const ctrl = new PlanillaController()

planillaRouter.get('/:asignacion_id', ctrl.get)
