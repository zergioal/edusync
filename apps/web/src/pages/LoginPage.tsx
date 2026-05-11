import { useState, type FormEvent } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getRolDashboardPath } from '../lib/roleRoutes'
import { Button, Input } from '@edusync/ui'
import { Spinner } from '@edusync/ui'

export default function LoginPage() {
  const { user, isLoading, login } = useAuth()
  const navigate = useNavigate()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  // Si ya hay sesión activa, redirigir al dashboard del rol
  if (!isLoading && user) {
    return <Navigate to={getRolDashboardPath(user.rol)} replace />
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Spinner size="lg" />
      </div>
    )
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      // La redirección ocurre una vez que el estado se actualiza y el
      // Navigate de arriba se dispara — pero por si el estado no reactiva:
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
      {/* Panel izquierdo — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 text-white">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500 shadow-lg font-bold text-xl">
            E
          </div>
          <span className="text-xl font-bold tracking-tight">EduSync</span>
        </div>

        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm backdrop-blur-sm">
            <span className="h-2 w-2 rounded-full bg-green-400"></span>
            Sistema de Gestión Educativa — Ley 070
          </div>
          <h1 className="text-4xl font-bold leading-tight">
            Gestión educativa<br />
            <span className="text-blue-400">moderna y eficiente</span>
          </h1>
          <p className="text-lg text-slate-300 max-w-md">
            Administra calificaciones, asistencia, horarios y comunicación
            de toda tu unidad educativa desde un solo lugar.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Estudiantes', desc: 'Seguimiento completo' },
            { label: 'Docentes',    desc: 'Gestión de clases'    },
            { label: 'Padres',      desc: 'Comunicación directa' },
          ].map(f => (
            <div key={f.label} className="rounded-xl bg-white/5 p-4 backdrop-blur-sm border border-white/10">
              <p className="font-semibold text-white">{f.label}</p>
              <p className="text-xs text-slate-400 mt-1">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Panel derecho — formulario */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Logo móvil */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500 shadow-lg font-bold text-xl text-white">
              E
            </div>
            <span className="text-xl font-bold text-white tracking-tight">EduSync</span>
          </div>

          <div className="rounded-2xl bg-white p-8 shadow-2xl">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900">Iniciar sesión</h2>
              <p className="mt-1 text-sm text-gray-500">
                Ingresa tus credenciales para acceder al sistema
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                label="Correo electrónico"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="usuario@colegio.edu.bo"
                required
                autoFocus
                autoComplete="email"
              />

              <div className="space-y-1">
                <Input
                  label="Contraseña"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    className="text-xs text-blue-600 hover:underline"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
              </div>

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
                className="w-full py-2.5"
              >
                Ingresar al sistema
              </Button>
            </form>

            <p className="mt-6 text-center text-xs text-gray-400">
              EduSync &copy; {new Date().getFullYear()} — U.E. Privada Pío XII
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
