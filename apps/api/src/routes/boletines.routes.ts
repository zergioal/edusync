import { Router } from 'express'
import { BoletinesController } from '../controllers/boletines.controller'
import { checkAccesoAcademico } from '../middlewares/checkAccesoAcademico'

export const boletinesRouter = Router()
const ctrl = new BoletinesController()

boletinesRouter.get('/:estudiante_id',      checkAccesoAcademico, ctrl.getBoletin)
boletinesRouter.get('/:estudiante_id/pdf',  checkAccesoAcademico, ctrl.getBoletinPdf)
