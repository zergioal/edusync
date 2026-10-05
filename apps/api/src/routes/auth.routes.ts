import { Router } from 'express'
import { AuthController } from '../controllers/auth.controller'
import { loginRateLimit } from '../middlewares/rateLimit'

export const authRouter = Router()
const ctrl = new AuthController()

authRouter.post('/login',   loginRateLimit, ctrl.login)
authRouter.post('/refresh', loginRateLimit, ctrl.refresh)
authRouter.post('/logout',  ctrl.logout)
