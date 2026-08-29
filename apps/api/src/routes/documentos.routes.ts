import { Router } from 'express'
import { DocumentosController } from '../controllers/documentos.controller'
import { requireRol } from '../middlewares/requireRol'
import { Rol } from '@edusync/types'

export const documentosRouter = Router()
const ctrl = new DocumentosController()

const canManage = requireRol(Rol.SECRETARIA, Rol.ADMIN_SISTEMA, Rol.DIRECTOR, Rol.COORDINADOR)

documentosRouter.get('/tipos',                    canManage, ctrl.tipos)
documentosRouter.get('/reporte/pendientes',       canManage, ctrl.reportePendientes)
documentosRouter.get('/reporte/pendientes/pdf',   canManage, ctrl.reportePendientesPdf)
documentosRouter.get('/reporte/pendientes/excel', canManage, ctrl.reportePendientesExcel)
documentosRouter.get('/:estudiante_id',           canManage, ctrl.getChecklist)
documentosRouter.patch('/:estudiante_id',         canManage, ctrl.toggle)
