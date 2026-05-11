import { Router } from 'express'
import { AsistenciaController } from '../controllers/asistencia.controller'
import { requireRol } from '../middlewares/requireRol'
import { Rol } from '@edusync/types'

export const asistenciaRouter = Router()
const ctrl = new AsistenciaController()

const canManage = requireRol(Rol.COORDINADOR, Rol.DIRECTOR, Rol.ADMIN_SISTEMA)
const isDocente = requireRol(Rol.DOCENTE)
const isRegente = requireRol(Rol.REGENTE, Rol.COORDINADOR, Rol.DIRECTOR, Rol.ADMIN_SISTEMA)

// ── Vistas estudiante/padre ────────────────────────────────────────────────
asistenciaRouter.get('/mia',                      ctrl.getMia)
asistenciaRouter.get('/hijo/:estudiante_id',       ctrl.getHijo)

// ── Asistencia de clase (docente) ──────────────────────────────────────────
asistenciaRouter.post('/clase',                    isDocente,  ctrl.registrarClase)
asistenciaRouter.get('/clase/reporte',             canManage,  ctrl.reporteClase)
asistenciaRouter.get('/clase',                     ctrl.getClase)

// ── Asistencia diaria (regente) ────────────────────────────────────────────
asistenciaRouter.post('/diaria',                   isRegente,  ctrl.registrarDiaria)
asistenciaRouter.get('/diaria/reporte',            isRegente,  ctrl.reporteDiaria)
asistenciaRouter.get('/diaria',                    isRegente,  ctrl.getDiaria)

// ── Consolidada por estudiante ─────────────────────────────────────────────
asistenciaRouter.get('/consolidada/:estudiante_id', canManage, ctrl.getConsolidada)

// ── Helpers ────────────────────────────────────────────────────────────────
asistenciaRouter.get('/paralelos-regente',         isRegente,  ctrl.getParalelosRegente)
asistenciaRouter.get('/estudiantes-paralelo',      isRegente,  ctrl.getEstudiantesParalelo)
