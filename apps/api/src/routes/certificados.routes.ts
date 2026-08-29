import { Router } from 'express'
import { CertificadosController } from '../controllers/certificados.controller'
import { requireRol } from '../middlewares/requireRol'
import { Rol } from '@edusync/types'

export const certificadosRouter = Router()
const ctrl = new CertificadosController()

const canManage = requireRol(Rol.SECRETARIA, Rol.ADMIN_SISTEMA, Rol.DIRECTOR, Rol.COORDINADOR)

certificadosRouter.get('/tipos',                canManage, ctrl.tipos)
certificadosRouter.get('/reporte',              canManage, ctrl.listGlobal)
certificadosRouter.get('/reporte/pdf',          canManage, ctrl.listGlobalPdf)
certificadosRouter.get('/reporte/excel',        canManage, ctrl.listGlobalExcel)
certificadosRouter.get('/estudiante/:estudiante_id', canManage, ctrl.listByEstudiante)
certificadosRouter.post('/',                    canManage, ctrl.create)
certificadosRouter.delete('/:id',               canManage, ctrl.remove)
