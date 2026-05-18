import { Router, type Router as ExpressRouter } from 'express'
import { PensionesController } from '../controllers/pensiones.controller'
import { requireRol } from '../middlewares/requireRol'
import { Rol } from '@edusync/types'

export const pensionesRouter: ExpressRouter = Router()
const ctrl = new PensionesController()

const STAFF_FIN = requireRol(Rol.CONTADOR, Rol.DIRECTOR, Rol.ADMIN_SISTEMA, Rol.COORDINADOR, Rol.SECRETARIA, Rol.REGENTE, Rol.DOCENTE)
const CONTADOR  = requireRol(Rol.CONTADOR)
const ANULADOR  = requireRol(Rol.DIRECTOR, Rol.ADMIN_SISTEMA)

// mi-estado-financiero va primero para que no colisione con /:id/*
pensionesRouter.get('/mi-estado-financiero',              ctrl.miEstadoFinanciero)
pensionesRouter.get('/morosidad',                         STAFF_FIN,  ctrl.morosidad)
pensionesRouter.get('/estado-cuenta/:estudiante_id',      STAFF_FIN,  ctrl.estadoCuenta)
pensionesRouter.get('/preview-mes',                       STAFF_FIN,  ctrl.previewMes)
pensionesRouter.post('/generar-mes',                      STAFF_FIN,  ctrl.generarMes)
pensionesRouter.get('/',                                  STAFF_FIN,  ctrl.findAll)
pensionesRouter.put('/:id/pagar',                         CONTADOR,   ctrl.pagar)
pensionesRouter.put('/:id/anular',                        ANULADOR,   ctrl.anular)
