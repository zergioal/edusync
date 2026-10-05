import { AppError } from '../middlewares/errorHandler'

const SUPABASE_URL    = process.env['SUPABASE_URL']!
const SUPABASE_ANON   = process.env['SUPABASE_ANON_KEY']!

// GoTrue (el servicio de Auth de Supabase) responde los errores de este endpoint
// como { code, error_code, msg } — no como { error: { message } }. Se llama directo
// por REST (no con supabase-js) para poder leer el resultado en nuestro propio formato.
interface SupabaseAuthResponse {
  access_token?:  string
  refresh_token?: string
  user?:          { id: string; email: string }
  msg?:           string
}

export class AuthService {
  async login(email: string, password: string) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method:  'POST',
      headers: { 'apikey': SUPABASE_ANON, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, password }),
    })

    const data = await res.json() as SupabaseAuthResponse

    if (!res.ok || !data.access_token) {
      const msg = data.msg?.includes('Invalid login credentials')
        ? 'Correo o contraseña incorrectos'
        : data.msg ?? 'Credenciales inválidas'
      throw new AppError(401, msg, 'AUTH_FAILED')
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

    if (!res.ok || !data.access_token) {
      throw new AppError(401, 'Refresh token inválido o expirado', 'REFRESH_FAILED')
    }

    return {
      access_token:  data.access_token,
      refresh_token: data.refresh_token,
    }
  }
}
