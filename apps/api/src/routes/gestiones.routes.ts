import { Router } from 'express'
import { GestionesController } from '../controllers/gestiones.controller'
import { requireRol } from '../middlewares/requireRol'
import { Rol } from '@edusync/types'

export const gestionesRouter = Router()
const ctrl = new GestionesController()

const canManage = requireRol(Rol.DIRECTOR, Rol.ADMIN_SISTEMA)

gestionesRouter.get('/',                    ctrl.findAll)
gestionesRouter.get('/activa',              ctrl.findActiva)
gestionesRouter.get('/:id',                 ctrl.findOne)
gestionesRouter.get('/:id/resultados',      canManage, ctrl.getResultados)
gestionesRouter.post('/',                   canManage, ctrl.create)
gestionesRouter.patch('/:id/activar',       canManage, ctrl.activar)
gestionesRouter.post('/:id/cerrar',         canManage, ctrl.cerrar)
