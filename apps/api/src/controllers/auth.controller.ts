import type { NextFunction, Request, Response } from 'express'
import { AuthService } from '../services/auth.service'
import { AppError } from '../middlewares/errorHandler'

// A partir de cuántos intentos restantes se avisa al usuario en el mensaje de error.
const AVISO_INTENTOS_RESTANTES = 3

export class AuthController {
  private service = new AuthService()

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password } = req.body as { email: string; password: string }
      const result = await this.service.login(email, password)
      res.json({ data: result })
    } catch (e) {
      // express-rate-limit (loginRateLimit) deja el conteo en req.rateLimit — lo usamos
      // para avisar antes de que se bloquee, en vez de que el usuario se entere recién
      // al recibir el 429.
      if (e instanceof AppError && e.code === 'AUTH_FAILED') {
        const remaining = (req as Request & { rateLimit?: { remaining: number } }).rateLimit?.remaining
        if (remaining !== undefined && remaining > 0 && remaining <= AVISO_INTENTOS_RESTANTES) {
          e.message += `. Te queda${remaining === 1 ? '' : 'n'} ${remaining} intento${remaining === 1 ? '' : 's'} antes de que se bloquee el acceso temporalmente.`
        }
      }
      next(e)
    }
  }

  refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { refresh_token } = req.body as { refresh_token: string }
      const result = await this.service.refresh(refresh_token)
      res.json({ data: result })
    } catch (e) { next(e) }
  }

  logout = async (_req: Request, res: Response): Promise<void> => {
    res.json({ data: { message: 'Sesión cerrada' } })
  }
}
