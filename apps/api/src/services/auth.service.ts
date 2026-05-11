import { AppError } from '../middlewares/errorHandler'

const SUPABASE_URL    = process.env['SUPABASE_URL']!
const SUPABASE_ANON   = process.env['SUPABASE_ANON_KEY']!

interface SupabaseAuthResponse {
  access_token:  string
  refresh_token: string
  user:          { id: string; email: string }
  error?:        { message: string }
}

export class AuthService {
  async login(email: string, password: string) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method:  'POST',
      headers: { 'apikey': SUPABASE_ANON, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, password }),
    })

    const data = await res.json() as SupabaseAuthResponse

    if (!res.ok || data.error) {
      throw new AppError(401, data.error?.message ?? 'Credenciales inválidas', 'AUTH_FAILED')
    }

    return {
      access_token:  data.access_token,
      refresh_token: data.refresh_token,
      user:          data.user,
    }
  }

  async refresh(refresh_token: string) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method:  'POST',
      headers: { 'apikey': SUPABASE_ANON, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ refresh_token }),
    })

    const data = await res.json() as SupabaseAuthResponse

    if (!res.ok || data.error) {
      throw new AppError(401, 'Refresh token inválido o expirado', 'REFRESH_FAILED')
    }

    return {
      access_token:  data.access_token,
      refresh_token: data.refresh_token,
    }
  }
}
