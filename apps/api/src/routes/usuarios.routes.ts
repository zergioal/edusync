import { Router } from 'express'
import { UsuariosController } from '../controllers/usuarios.controller'

export const usuariosRouter = Router()
const ctrl = new UsuariosController()

usuariosRouter.get('/',     ctrl.findAll)
usuariosRouter.get('/me',   ctrl.me)
usuariosRouter.get('/:id',  ctrl.findOne)
usuariosRouter.post('/',    ctrl.create)
usuariosRouter.patch('/:id', ctrl.update)
usuariosRouter.delete('/:id', ctrl.remove)
