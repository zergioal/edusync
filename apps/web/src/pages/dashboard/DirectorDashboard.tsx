import { useState, useEffect, useRef } from 'react'
import { Routes, Route } from 'react-router-dom'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { StatCard } from '../../components/ui/StatCard'
import { useAuth } from '../../context/AuthContext'
import { useGestionActiva } from '../../hooks/useGestionActiva'
import { useToast } from '../../components/ui/Toast'
import { api, ApiError } from '../../lib/api'
import { Badge, Spinner, Button } from '@edusync/ui'
import { AvatarDisplay, AvatarPickerModal, useAvatar } from '../../components/ui/AvatarSelector'
import { ROL_LABELS } from '../../lib/roleRoutes'
import CargaHorariaDocentesPage from '../director/CargaHorariaDocentesPage'
import AnunciosInternosPage     from '../shared/AnunciosInternosPage'
import MensajesPage             from '../shared/MensajesPage'
import ReportesPage             from '../coordinador/ReportesPage'
import GestionesPage            from '../secretaria/GestionesPage'
import DocentesPage             from '../secretaria/DocentesPage'
import EstudiantesPage          from '../secretaria/EstudiantesPage'
import PerfilEstudiantePage     from '../secretaria/PerfilEstudiantePage'
import AuditoriaPage            from '../admin/AuditoriaPage'
import PadresPage               from '../secretaria/PadresPage'

interface GestionInfo {
  id:        string
  anno:      number
  activa:    boolean
  trimestres: Array<{ id: string; numero: number; cerrado: boolean }>
}

interface Stats {
  paralelos:    number
  docentes:     number
  estudiantes:  number
  pensionPend:  number
}

function DirectorHome() {
  const { user } = useAuth()
  const toast    = useToast()
  const toastRef = useRef(toast)
  toastRef.current = toast
  const { gestionLabel, trimestreLabel } = useGestionActiva()
  const { avatarId, showPicker, openPicker, closePicker, onSaved } = useAvatar(user?.id ?? '')

  const [gestiones,  setGestiones]  = useState<GestionInfo[]>([])
  const [stats,      setStats]      = useState<Stats | null>(null)
  const [loadingStats, setLoadingStats] = useState(true)
  const [cerrando,   setCerrando]   = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      api.get<GestionInfo[]>('/gestiones'),
      api.get<unknown[]>('/paralelos').catch(() => [] as unknown[]),
      api.get<unknown[]>('/docentes').catch(()  => [] as unknown[]),
      api.get<unknown[]>('/estudiantes').catch(() => [] as unknown[]),
    ]).then(([g, p, d, e]) => {
      setGestiones(Array.isArray(g) ? g : [])
      setStats({
        paralelos:    Array.isArray(p) ? p.length : 0,
        docentes:     Array.isArray(d) ? d.length : 0,
        estudiantes:  Array.isArray(e) ? e.length : 0,
        pensionPend:  0,
      })
    }).catch(() => {}).finally(() => setLoadingStats(false))
  }, [])

  async function cerrarGestion(id: string) {
    if (!confirm('¿Cerrar la gestión? Se calcularán los resultados finales y promociones.')) return
    setCerrando(id)
    try {
      const result = await api.post<{ resultados_calculados: number; promociones_calculadas: number }>(`/gestiones/${id}/cerrar`, {})
      toastRef.current.success(`Gestión cerrada. ${result.resultados_calculados} resultados, ${result.promociones_calculadas} promociones.`)
      setGestiones(prev => prev.map(g => g.id === id ? { ...g, activa: false } : g))
    } catch (err) {
      toastRef.current.error(err instanceof ApiError ? err.message : 'Error al cerrar gestión')
    } finally {
      setCerrando(null)
    }
  }

  const rolLabel = user?.rol ? (ROL_LABELS[user.rol] ?? user.rol) : ''

  return (
    <div className="space-y-6">

      {/* Profile card */}
      <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-5 flex items-start gap-5">
        <div className="relative">
          <AvatarDisplay userId={user?.id ?? ''} avatarId={avatarId} size="xl" />
          <button
            onClick={openPicker}
            className="absolute -bottom-1.5 -right-1.5 h-6 w-6 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center shadow hover:bg-indigo-700 transition-colors"
            title="Cambiar avatar"
          >✎</button>
        </div>

        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 leading-tight">
            {user?.nombre} {user?.apellido}
          </h1>
          <p className="text-sm text-gray-400 mt-0.5 truncate">{user?.email}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant="success">{rolLabel}</Badge>
            {gestionLabel && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{gestionLabel}</span>
            )}
          </div>
        </div>

        {trimestreLabel && (
          <div className="hidden sm:flex flex-col items-end rounded-xl bg-blue-50 border border-blue-100 px-4 py-2 text-right shrink-0">
            <p className="text-xs text-blue-500 font-medium">Trimestre activo</p>
            <p className="text-lg font-bold text-blue-700">{trimestreLabel}</p>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Resumen institucional</h2>
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <StatCard
            label="Paralelos"
            value={loadingStats ? '…' : (stats?.paralelos ?? '—')}
            icon="users"
            color="blue"
          />
          <StatCard
            label="Docentes"
            value={loadingStats ? '…' : (stats?.docentes ?? '—')}
            icon="teacher"
            color="green"
          />
          <StatCard
            label="Estudiantes"
            value={loadingStats ? '…' : (stats?.estudiantes ?? '—')}
            icon="student"
            color="purple"
          />
          <StatCard
            label="Pens. pendientes"
            value={loadingStats ? '…' : (stats?.pensionPend ?? '—')}
            icon="cash"
            color="yellow"
          />
        </div>
      </div>

      {/* Gestiones y trimestres */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Estado de gestiones</h2>
        <div className="space-y-3">
          {!loadingStats && gestiones.length === 0 ? (
            <div className="rounded-xl border border-gray-100 bg-white py-8 text-center text-sm text-gray-400 shadow-sm">
              No hay gestiones registradas
            </div>
          ) : loadingStats ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : gestiones.map(g => {
            const cerrados = g.trimestres.filter(t => t.cerrado).length
            const total    = g.trimestres.length
            const todosC   = total > 0 && cerrados === total
            return (
              <div key={g.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-gray-900">Gestión {g.anno}</h3>
                    <Badge variant={g.activa ? 'success' : 'info'}>{g.activa ? 'Activa' : 'Inactiva'}</Badge>
                    <span className="text-sm text-gray-500">{cerrados}/{total} trimestres cerrados</span>
                  </div>
                  {g.activa && todosC && (
                    <Button variant="danger" size="sm" loading={cerrando === g.id} onClick={() => cerrarGestion(g.id)}>
                      Cerrar gestión
                    </Button>
                  )}
                </div>
                {g.trimestres.length > 0 && (
                  <div className="mt-3 flex gap-2">
                    {g.trimestres.map(t => (
                      <span
                        key={t.id}
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          t.cerrado ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        T{t.numero} {t.cerrado ? '✓' : '—'}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {showPicker && user && (
        <AvatarPickerModal userId={user.id} onClose={closePicker} onSaved={onSaved} />
      )}
    </div>
  )
}

export default function DirectorDashboard() {
  return (
    <DashboardLayout>
      <Routes>
        <Route index                    element={<DirectorHome />} />
        <Route path="docentes"          element={<DocentesPage />} />
        <Route path="padres"            element={<PadresPage />} />
        <Route path="estudiantes"       element={<EstudiantesPage basePath="/dashboard/director" />} />
        <Route path="estudiante/:id"    element={<PerfilEstudiantePage />} />
        <Route path="gestiones"         element={<GestionesPage />} />
        <Route path="reportes/*"        element={<ReportesPage />} />
        <Route path="carga-horaria"     element={<CargaHorariaDocentesPage />} />
        <Route path="anuncios"          element={<AnunciosInternosPage />} />
        <Route path="mensajes"          element={<MensajesPage />} />
        <Route path="auditoria"         element={<AuditoriaPage />} />
        <Route path="*"                 element={<DirectorHome />} />
      </Routes>
    </DashboardLayout>
  )
}
