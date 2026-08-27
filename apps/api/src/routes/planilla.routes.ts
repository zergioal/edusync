import { Router } from 'express'
import { PlanillaController } from '../controllers/planilla.controller'
import { checkAccesoAcademico } from '../middlewares/checkAccesoAcademico'
import { requireRol } from '../middlewares/requireRol'
import { Rol } from '@edusync/types'

export const planillaRouter = Router()
const ctrl = new PlanillaController()

const canManage = requireRol(Rol.DOCENTE, Rol.ADMIN_SISTEMA, Rol.DIRECTOR, Rol.COORDINADOR)
const canViewEstudiante = requireRol(Rol.ADMIN_SISTEMA, Rol.DIRECTOR, Rol.COORDINADOR, Rol.SECRETARIA)

// ── Vistas estudiante/padre: planilla detallada de un solo estudiante ────────
planillaRouter.get('/mia',                checkAccesoAcademico, ctrl.getMia)
planillaRouter.get('/hijo/:estudiante_id', checkAccesoAcademico, ctrl.getHijo)

// ── Vista staff: planilla detallada de cualquier estudiante de la institución ─
planillaRouter.get('/estudiante/:estudiante_id', canViewEstudiante, ctrl.getParaStaff)

// ── Vista docente: planilla completa de un paralelo ───────────────────────────
planillaRouter.get('/:asignacion_id/registro/pdf',            canManage, ctrl.getRegistroPdf)
planillaRouter.get('/:asignacion_id/registro/excel',           canManage, ctrl.getRegistroExcel)
planillaRouter.get('/:asignacion_id/centralizador/pdf',        canManage, ctrl.getCentralizadorAsignacionPdf)
planillaRouter.get('/:asignacion_id/centralizador/excel',      canManage, ctrl.getCentralizadorAsignacionExcel)
planillaRouter.get('/:asignacion_id/centralizador',            canManage, ctrl.getCentralizadorAsignacion)
planillaRouter.get('/:asignacion_id', canManage, ctrl.get)
