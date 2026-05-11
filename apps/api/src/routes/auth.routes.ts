import { Router } from 'express'
import { AuthController } from '../controllers/auth.controller'

export const authRouter = Router()
const ctrl = new AuthController()

authRouter.post('/login',   ctrl.login)
authRouter.post('/refresh', ctrl.refresh)
authRouter.post('/logout',  ctrl.logout)
