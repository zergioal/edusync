import { Router } from 'express'
import { IndicadoresController } from '../controllers/indicadores.controller'
import { requireRol } from '../middlewares/requireRol'
import { Rol } from '@edusync/types'

export const indicadoresRouter = Router()
const ctrl = new IndicadoresController()

const onlyDocente = requireRol(Rol.DOCENTE)

indicadoresRouter.post('/',     onlyDocente, ctrl.create)
indicadoresRouter.put('/:id',   onlyDocente, ctrl.update)
indicadoresRouter.delete('/:id', onlyDocente, ctrl.remove)
