import {
  createContext, useContext, useState, useEffect,
  useCallback, type ReactNode,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import { Rol } from '@edusync/types'
import { supabase } from '../lib/supabase'
import { getTenantHeaders } from '../config/tenant'

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface AppUser {
  id:             string
  email:          string
  nombre:         string
  apellido:       string
  rol:            Rol
  institucion_id: string
  activo:         boolean
}

export interface EstadoFinanciero {
  bloqueado:       boolean
  mes_activo:      number
  deuda_pendiente: number
  mensaje:         string
  qr_pago_url:     string | null
  whatsapp:        string | null
  becado?: boolean
  hijos: Array<{
    id:              string
    nombre:          string
    apellido:        string
    bloqueado:       boolean
    becado:          boolean
    monto_pendiente: number
  }>
}

interface AuthState {
  user:             AppUser | null
  session:          Session | null
  isLoading:        boolean
  estadoFinanciero: EstadoFinanciero | null
}

interface AuthContextValue extends AuthState {
  login:                  (email: string, password: string) => Promise<void>
  logout:                 () => Promise<void>
  refreshEstadoFinanciero: () => Promise<void>
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const API_BASE: string = ((import.meta as unknown as any).env?.VITE_API_URL) ?? '/api/v1'

class AuthError extends Error {}

async function fetchAppUser(accessToken: string): Promise<AppUser> {
  const res = await fetch(`${API_BASE}/usuarios/me`, {
    headers: { ...getTenantHeaders(), Authorization: `Bearer ${accessToken}` },
  })
  if (res.status === 401 || res.status === 403) throw new AuthError('Sesión no autorizada')
  if (!res.ok) throw new Error(`Server error ${res.status}`)
  const { data } = await res.json() as { data: AppUser }
  return data
}

async function fetchEstadoFinanciero(accessToken: string): Promise<EstadoFinanciero> {
  const res = await fetch(`${API_BASE}/pensiones/mi-estado-financiero`, {
    headers: { ...getTenantHeaders(), Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error(`Server error ${res.status}`)
  const { data } = await res.json() as { data: EstadoFinanciero }
  return data
}

const ROLES_CON_BLOQUEO: Rol[] = [Rol.ESTUDIANTE, Rol.PADRE_TUTOR]

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user:             null,
    session:          null,
    isLoading:        true,
    estadoFinanciero: null,
  })

  const loadUserProfile = useCallback(async (session: Session) => {
    const attempt = async (retry: boolean): Promise<void> => {
      try {
        const appUser = await fetchAppUser(session.access_token)

        // Cargar estado financiero solo para roles con restricción de acceso
        let estadoFinanciero: EstadoFinanciero | null = null
        if (ROLES_CON_BLOQUEO.includes(appUser.rol)) {
          try {
            estadoFinanciero = await fetchEstadoFinanciero(session.access_token)
          } catch {
            // No bloquear el login si falla este endpoint
          }
        }

        setState({ user: appUser, session, isLoading: false, estadoFinanciero })
      } catch (err) {
        if (err instanceof AuthError) {
          setState({ user: null, session: null, isLoading: false, estadoFinanciero: null })
        } else if (retry) {
          await new Promise(r => setTimeout(r, 2000))
          await attempt(false)
        } else {
          setState(prev => ({ ...prev, session, isLoading: false }))
        }
      }
    }
    await attempt(true)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        loadUserProfile(session)
      } else {
        setState(s => ({ ...s, isLoading: false }))
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session) {
          loadUserProfile(session)
        } else {
          setState({ user: null, session: null, isLoading: false, estadoFinanciero: null })
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [loadUserProfile])

  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      const msg = error.message.includes('Invalid login credentials')
        ? 'Correo o contraseña incorrectos'
        : error.message
      throw new Error(msg)
    }
    if (data.session) await loadUserProfile(data.session)
  }

  const logout = async () => {
    setState({ user: null, session: null, isLoading: false, estadoFinanciero: null })
    await supabase.auth.signOut()
  }

  const refreshEstadoFinanciero = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session || !state.user || !ROLES_CON_BLOQUEO.includes(state.user.rol)) return
    try {
      const ef = await fetchEstadoFinanciero(session.access_token)
      setState(prev => ({ ...prev, estadoFinanciero: ef }))
    } catch {
      // ignore
    }
  }, [state.user])

  return (
    <AuthContext.Provider value={{ ...state, login, logout, refreshEstadoFinanciero }}>
      {children}
    </AuthContext.Provider>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
