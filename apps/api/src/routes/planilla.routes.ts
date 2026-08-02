import { Router } from 'express'
import { PlanillaController } from '../controllers/planilla.controller'
import { checkAccesoAcademico } from '../middlewares/checkAccesoAcademico'
import { requireRol } from '../middlewares/requireRol'
import { Rol } from '@edusync/types'

export const planillaRouter = Router()
const ctrl = new PlanillaController()

const canManage = requireRol(Rol.DOCENTE, Rol.ADMIN_SISTEMA, Rol.DIRECTOR, Rol.COORDINADOR)

// ── Vistas estudiante/padre: planilla detallada de un solo estudiante ────────
planillaRouter.get('/mia',                checkAccesoAcademico, ctrl.getMia)
planillaRouter.get('/hijo/:estudiante_id', checkAccesoAcademico, ctrl.getHijo)

// ── Vista docente: planilla completa de un paralelo ───────────────────────────
planillaRouter.get('/:asignacion_id', canManage, ctrl.get)
