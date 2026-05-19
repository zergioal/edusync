import { useState, useCallback, type FormEvent, type KeyboardEvent } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getRolDashboardPath } from '../lib/roleRoutes'
import { Button, Input, Spinner } from '@edusync/ui'
import logo from '../assets/logo-pio-xii.png'

// ── Eye icon ─────────────────────────────────────────────────────────────────
function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const { user, isLoading, login } = useAuth()

  // ⚠ Todos los hooks ANTES de cualquier return condicional
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPwd,  setShowPwd]  = useState(false)
  const [capsLock, setCapsLock] = useState(false)
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  const handleCapsLock = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    setCapsLock(e.getModifierState('CapsLock'))
  }, [])

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }, [login, email, password])

  // Early returns DESPUÉS de todos los hooks
  if (!isLoading && user) {
    return <Navigate to={getRolDashboardPath(user.rol)} replace />
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-100">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-blue-50 to-slate-200 p-4">
      {/* Decoración de fondo */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-blue-200/40 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-indigo-200/40 blur-3xl" />
      </div>

      {/* Card */}
      <div className="relative w-full max-w-sm">
        <div className="rounded-2xl bg-white shadow-2xl ring-1 ring-gray-200 p-8">

          {/* Botón volver */}
          <Link
            to="/"
            className="group mb-6 flex items-center gap-2 text-sm text-gray-400 hover:text-blue-600 transition-colors w-fit"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 bg-gray-50 group-hover:border-blue-300 group-hover:bg-blue-50 transition-all shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </span>
            <span className="font-medium">Volver al inicio</span>
          </Link>

          {/* Logo institucional */}
          <div className="flex flex-col items-center gap-3 mb-6">
            <img
              src={logo}
              alt="U.E. Privada Pío XII"
              className="h-28 w-28 object-contain drop-shadow-md"
            />
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-600 leading-tight">U.E. Privada</p>
              <p className="text-base font-bold text-gray-900 leading-tight">Pío XII</p>
            </div>
          </div>

          <div className="mb-5 text-center">
            <h1 className="text-xl font-bold text-gray-900">Iniciar sesión</h1>
            <p className="mt-1 text-sm text-gray-500">Ingresa tus credenciales para continuar</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <Input
              label="Correo electrónico"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="usuario@uepioxii.edu.bo"
              required
              autoFocus
              autoComplete="email"
              className="w-full"
            />

            {/* Contraseña con botón ojo */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Contraseña</label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={handleCapsLock}
                  onKeyUp={handleCapsLock}
                  required
                  autoComplete="current-password"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-10 text-sm shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                  aria-label={showPwd ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  <EyeIcon open={showPwd} />
                </button>
              </div>
              {capsLock && (
                <div className="flex items-center gap-1.5 rounded-md bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs text-amber-700">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9V3m0 0L9 6m3-3l3 3M5 11v8a2 2 0 002 2h10a2 2 0 002-2v-8M3 11h18" />
                  </svg>
                  <span>Mayúsculas activadas</span>
                </div>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                <svg className="h-4 w-4 flex-shrink-0 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              loading={loading}
              disabled={!email || !password}
              className="w-full py-2.5 mt-1"
            >
              Ingresar al sistema
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-gray-400 leading-relaxed">
            EduSync &copy; {new Date().getFullYear()} — U.E. Privada Pío XII
            <br />
            <span className="text-gray-300">Desarrollado por Sergio M. Alcocer V.</span>
          </p>
        </div>
      </div>
    </div>
  )
}
