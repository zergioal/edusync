import { Router } from 'express'
import multer from 'multer'
import { PlanillaController } from '../controllers/planilla.controller'
import { checkAccesoAcademico } from '../middlewares/checkAccesoAcademico'
import { checkAccesoAsignacion } from '../middlewares/checkAccesoAsignacion'
import { requireRol } from '../middlewares/requireRol'
import { Rol } from '@edusync/types'

export const planillaRouter = Router()
const ctrl = new PlanillaController()

const canManage = requireRol(Rol.DOCENTE, Rol.ADMIN_SISTEMA, Rol.DIRECTOR, Rol.COORDINADOR)
const canViewEstudiante = requireRol(Rol.ADMIN_SISTEMA, Rol.DIRECTOR, Rol.COORDINADOR, Rol.SECRETARIA)
// Nota extracurricular: el docente la ve en su registro pero no puede editarla — solo estos roles.
const canGestionarExtracurricular = requireRol(Rol.ADMIN_SISTEMA, Rol.DIRECTOR, Rol.COORDINADOR, Rol.SECRETARIA)
// Importar/exportar notas: mismo criterio que registrar una nota individual (solo el docente dueño).
const canImportar = requireRol(Rol.DOCENTE)

const uploadNotas = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/\.(xlsx|xls|csv)$/i.test(file.originalname)) cb(null, true)
    else cb(new Error('Solo se aceptan archivos .xlsx, .xls o .csv'))
  },
})

// ── Vistas estudiante/padre: planilla detallada de un solo estudiante ────────
planillaRouter.get('/mia',                checkAccesoAcademico, ctrl.getMia)
planillaRouter.get('/hijo/:estudiante_id', checkAccesoAcademico, ctrl.getHijo)

// ── Vista staff: planilla detallada de cualquier estudiante de la institución ─
planillaRouter.get('/estudiante/:estudiante_id', canViewEstudiante, ctrl.getParaStaff)

// ── Vista docente: planilla completa de un paralelo ───────────────────────────
// checkAccesoAsignacion va después del rol: primero se filtra por rol, luego se
// confirma que ESA asignación en particular le pertenece al usuario (o a su institución).
planillaRouter.get('/:asignacion_id/registro/pdf',            canManage, checkAccesoAsignacion, ctrl.getRegistroPdf)
planillaRouter.get('/:asignacion_id/registro/excel',           canManage, checkAccesoAsignacion, ctrl.getRegistroExcel)
planillaRouter.get('/:asignacion_id/centralizador/pdf',        canManage, checkAccesoAsignacion, ctrl.getCentralizadorAsignacionPdf)
planillaRouter.get('/:asignacion_id/centralizador/excel',      canManage, checkAccesoAsignacion, ctrl.getCentralizadorAsignacionExcel)
planillaRouter.get('/:asignacion_id/centralizador',            canManage, checkAccesoAsignacion, ctrl.getCentralizadorAsignacion)
planillaRouter.get('/:asignacion_id/subareas',                  canManage, checkAccesoAsignacion, ctrl.getCentralizadorSubareas)
planillaRouter.get('/:asignacion_id/nota-extracurricular', canGestionarExtracurricular, checkAccesoAsignacion, ctrl.getNotaExtracurricular)
planillaRouter.put('/:asignacion_id/nota-extracurricular', canGestionarExtracurricular, checkAccesoAsignacion, ctrl.putNotaExtracurricular)
planillaRouter.get('/:asignacion_id/plantilla',  canImportar, checkAccesoAsignacion, ctrl.getPlantillaNotas)
planillaRouter.post('/:asignacion_id/importar',  canImportar, checkAccesoAsignacion, uploadNotas.single('file'), ctrl.postImportarNotas)
planillaRouter.get('/:asignacion_id', canManage, checkAccesoAsignacion, ctrl.get)
