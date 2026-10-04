import { Router } from 'express'
import multer from 'multer'
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
const canResetPassword = requireRol(
  Rol.ADMIN_SISTEMA, Rol.DIRECTOR, Rol.COORDINADOR, Rol.CONTADOR, Rol.SECRETARIA,
)

const uploadFoto = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 3 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|png|webp)$/.test(file.mimetype)) cb(null, true)
    else cb(new Error('Solo se aceptan imágenes JPG, PNG o WEBP'))
  },
})

usuariosRouter.get('/',       ctrl.findAll)
usuariosRouter.get('/me',     ctrl.me)
usuariosRouter.patch('/me',   isStaff, ctrl.updateMe)
usuariosRouter.post('/me/foto',   isStaff, uploadFoto.single('file'), ctrl.subirFoto)
usuariosRouter.delete('/me/foto', isStaff, ctrl.quitarFoto)
usuariosRouter.get('/:id',    ctrl.findOne)
usuariosRouter.post('/',      ctrl.create)
usuariosRouter.patch('/:id/reset-password', canResetPassword, ctrl.resetPassword)
usuariosRouter.patch('/:id',  isAdmin, ctrl.update)
usuariosRouter.delete('/:id', isAdmin, ctrl.remove)
