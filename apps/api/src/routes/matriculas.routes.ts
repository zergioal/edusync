import { Router } from 'express'
import { MatriculasController } from '../controllers/matriculas.controller'
import { requireRol } from '../middlewares/requireRol'
import { Rol } from '@edusync/types'

export const matriculasRouter = Router()
const ctrl = new MatriculasController()

const canManageTecnica = requireRol(Rol.ADMIN_SISTEMA, Rol.DIRECTOR, Rol.COORDINADOR, Rol.SECRETARIA)

matriculasRouter.get('/',  ctrl.findAll)
matriculasRouter.post('/', ctrl.create)
matriculasRouter.patch('/:estudiante_id/:gestion_id/tecnica', canManageTecnica, ctrl.toggleTecnica)
