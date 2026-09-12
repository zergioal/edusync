import { Router } from 'express'
import { ReportesController } from '../controllers/reportes.controller'
import { requireRol }         from '../middlewares/requireRol'
import { checkAlcanceCoordinador } from '../middlewares/checkAlcanceCoordinador'
import { checkAccesoBTH } from '../middlewares/checkAccesoBTH'
import { Rol } from '@edusync/types'

export const reportesRouter = Router()
const ctrl = new ReportesController()

const canViewHonor = requireRol(Rol.COORDINADOR, Rol.DIRECTOR, Rol.SECRETARIA, Rol.ADMIN_SISTEMA)
const canViewFull  = requireRol(Rol.COORDINADOR, Rol.DIRECTOR, Rol.SECRETARIA, Rol.ADMIN_SISTEMA)
const canSecretaria = requireRol(Rol.SECRETARIA, Rol.COORDINADOR, Rol.DIRECTOR, Rol.ADMIN_SISTEMA)
const canViewBTH    = requireRol(Rol.COORDINADOR, Rol.DIRECTOR, Rol.ADMIN_SISTEMA)

reportesRouter.get('/cuadro-honor',          canViewHonor, checkAlcanceCoordinador, ctrl.cuadroHonor)
reportesRouter.get('/cuadro-honor/pdf',      canViewHonor, checkAlcanceCoordinador, ctrl.cuadroHonorPdf)
reportesRouter.get('/centralizador',         canViewFull,  checkAlcanceCoordinador, ctrl.centralizador)
reportesRouter.get('/centralizador/pdf',     canViewFull,  checkAlcanceCoordinador, ctrl.centralizadorPdf)
reportesRouter.get('/centralizador/excel',   canViewFull,  checkAlcanceCoordinador, ctrl.centralizadorExcel)
reportesRouter.get('/parciales',             canViewFull,  checkAlcanceCoordinador, ctrl.parciales)
reportesRouter.get('/carpetas-entregables',  canViewHonor, checkAlcanceCoordinador, ctrl.carpetas)
reportesRouter.get('/promocion-anual',       canViewFull,  checkAlcanceCoordinador, ctrl.promocionAnual)

// ── Reportes de BTH ───────────────────────────────────────────────────────
reportesRouter.get('/bth/lista-tecnica',        canViewBTH, checkAccesoBTH, checkAlcanceCoordinador, ctrl.listaTecnica)
reportesRouter.get('/bth/lista-tecnica/pdf',    canViewBTH, checkAccesoBTH, checkAlcanceCoordinador, ctrl.listaTecnicaPdf)
reportesRouter.get('/bth/lista-tecnica/excel',  canViewBTH, checkAccesoBTH, checkAlcanceCoordinador, ctrl.listaTecnicaExcel)
reportesRouter.get('/bth/notas-subareas',       canViewBTH, checkAccesoBTH, checkAlcanceCoordinador, ctrl.notasSubareas)
reportesRouter.get('/bth/notas-subareas/pdf',   canViewBTH, checkAccesoBTH, checkAlcanceCoordinador, ctrl.notasSubareasPdf)
reportesRouter.get('/bth/notas-subareas/excel', canViewBTH, checkAccesoBTH, checkAlcanceCoordinador, ctrl.notasSubareasExcel)

// ── Reportes de Secretaría ───────────────────────────────────────────────
reportesRouter.get('/nomina',                        canSecretaria, ctrl.nomina)
reportesRouter.get('/nomina/pdf',                     canSecretaria, ctrl.nominaPdf)
reportesRouter.get('/nomina/excel',                   canSecretaria, ctrl.nominaExcel)

reportesRouter.get('/ficha-estudiante/pdf/:estudiante_id', canSecretaria, ctrl.fichaEstudiantePdf)
reportesRouter.get('/ficha-estudiante/:estudiante_id',      canSecretaria, ctrl.fichaEstudiante)

reportesRouter.get('/estado-matricula',               canSecretaria, ctrl.estadoMatricula)
reportesRouter.get('/estado-matricula/pdf',            canSecretaria, ctrl.estadoMatriculaPdf)
reportesRouter.get('/estado-matricula/excel',          canSecretaria, ctrl.estadoMatriculaExcel)

reportesRouter.get('/estadistica-matricula',           canSecretaria, ctrl.estadisticaMatricula)
reportesRouter.get('/estadistica-matricula/pdf',        canSecretaria, ctrl.estadisticaMatriculaPdf)
reportesRouter.get('/estadistica-matricula/excel',      canSecretaria, ctrl.estadisticaMatriculaExcel)

reportesRouter.get('/padres-tutores',                  canSecretaria, ctrl.padresTutores)
reportesRouter.get('/padres-tutores/pdf',               canSecretaria, ctrl.padresTutoresPdf)
reportesRouter.get('/padres-tutores/excel',             canSecretaria, ctrl.padresTutoresExcel)
