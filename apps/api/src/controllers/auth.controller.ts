import type { Request, Response } from 'express'
import { AuthService } from '../services/auth.service'

export class AuthController {
  private service = new AuthService()

  login = async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body as { email: string; password: string }
    const result = await this.service.login(email, password)
    res.json({ data: result })
  }

  refresh = async (req: Request, res: Response): Promise<void> => {
    const { refresh_token } = req.body as { refresh_token: string }
    const result = await this.service.refresh(refresh_token)
    res.json({ data: result })
  }

  logout = async (_req: Request, res: Response): Promise<void> => {
    res.json({ data: { message: 'Sesión cerrada' } })
  }
}
