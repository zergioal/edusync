import { Router } from 'express'
import { NotasController } from '../controllers/notas.controller'
import { requireRol } from '../middlewares/requireRol'
import { Rol } from '@edusync/types'

export const notasRouter = Router()
const ctrl = new NotasController()

notasRouter.put('/', requireRol(Rol.DOCENTE), ctrl.upsert)
