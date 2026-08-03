import { Router } from 'express'
import { UsuariosController } from '../controllers/usuarios.controller'
import { requireRol } from '../middlewares/requireRol'
import { Rol } from '@edusync/types'

export const usuariosRouter = Router()
const ctrl = new UsuariosController()

const isStaff  = requireRol(
  Rol.DOCENTE, Rol.DIRECTOR, Rol.COORDINADOR, Rol.SECRETARIA,
  Rol.REGENTE, Rol.CONTADOR, Rol.ADMIN_SISTEMA,
)
const isAdmin = requireRol(Rol.ADMIN_SISTEMA)

usuariosRouter.get('/',       ctrl.findAll)
usuariosRouter.get('/me',     ctrl.me)
usuariosRouter.patch('/me',   isStaff, ctrl.updateMe)
usuariosRouter.get('/:id',    ctrl.findOne)
usuariosRouter.post('/',      ctrl.create)
usuariosRouter.patch('/:id',  isAdmin, ctrl.update)
usuariosRouter.delete('/:id', isAdmin, ctrl.remove)
