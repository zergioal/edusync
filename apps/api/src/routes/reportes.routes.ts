import { Router } from 'express'
import { ReportesController } from '../controllers/reportes.controller'
import { requireRol }         from '../middlewares/requireRol'
import { Rol } from '@edusync/types'

export const reportesRouter = Router()
const ctrl = new ReportesController()

const canViewHonor = requireRol(Rol.COORDINADOR, Rol.DIRECTOR, Rol.SECRETARIA, Rol.ADMIN_SISTEMA)
const canViewFull  = requireRol(Rol.COORDINADOR, Rol.DIRECTOR, Rol.ADMIN_SISTEMA)

reportesRouter.get('/cuadro-honor',          canViewHonor, ctrl.cuadroHonor)
reportesRouter.get('/cuadro-honor/pdf',      canViewHonor, ctrl.cuadroHonorPdf)
reportesRouter.get('/centralizador',         canViewFull,  ctrl.centralizador)
reportesRouter.get('/centralizador/pdf',     canViewFull,  ctrl.centralizadorPdf)
reportesRouter.get('/centralizador/excel',   canViewFull,  ctrl.centralizadorExcel)
reportesRouter.get('/parciales',             canViewFull,  ctrl.parciales)
reportesRouter.get('/carpetas-entregables',  canViewHonor, ctrl.carpetas)
reportesRouter.get('/promocion-anual',       canViewFull,  ctrl.promocionAnual)
