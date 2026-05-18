import { useState, useEffect, useRef } from 'react'
import { Routes, Route } from 'react-router-dom'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { StatCard } from '../../components/ui/StatCard'
import { useAuth } from '../../context/AuthContext'
import { useGestionActiva } from '../../hooks/useGestionActiva'
import { useToast } from '../../components/ui/Toast'
import { api, ApiError } from '../../lib/api'
import { Badge, Spinner, Button } from '@edusync/ui'
import CargaHorariaDocentesPage from '../director/CargaHorariaDocentesPage'
import AnunciosInternosPage     from '../shared/AnunciosInternosPage'
import MensajesPage             from '../shared/MensajesPage'
import ReportesPage             from '../coordinador/ReportesPage'
import GestionesPage            from '../secretaria/GestionesPage'
import DocentesPage             from '../secretaria/DocentesPage'
import EstudiantesPage          from '../secretaria/EstudiantesPage'
import PerfilEstudiantePage     from '../secretaria/PerfilEstudiantePage'
import AuditoriaPage            from '../admin/AuditoriaPage'
import PadresPage              from '../secretaria/PadresPage'

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

  const [gestiones, setGestiones] = useState<GestionInfo[]>([])
  const [stats,     setStats]     = useState<Stats | null>(null)
  const [cerrando,  setCerrando]  = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      api.get<GestionInfo[]>('/gestiones'),
      api.get<{ data: unknown[] }>('/paralelos').catch(() => ({ data: [] })),
      api.get<{ data: unknown[] }>('/docentes').catch(() => ({ data: [] })),
    ]).then(([g, p, d]) => {
      setGestiones(g)
      setStats({
        paralelos:   Array.isArray(p) ? p.length : 0,
        docentes:    Array.isArray(d) ? d.length : 0,
        estudiantes: 0,
        pensionPend: 0,
      })
    }).catch(() => {})
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

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Director/a: {user?.nombre} {user?.apellido}
          </h1>
          <div className="mt-1 flex items-center gap-2">
            <Badge variant="success">Director</Badge>
            {gestionLabel && <span className="text-sm text-gray-400">{gestionLabel}</span>}
          </div>
        </div>
        {trimestreLabel && (
          <div className="rounded-xl bg-blue-50 px-4 py-2 text-right">
            <p className="text-xs text-blue-500 font-medium">Trimestre activo</p>
            <p className="text-lg font-bold text-blue-700">{trimestreLabel}</p>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">Resumen institucional</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Paralelos"  value={stats?.paralelos ?? '—'}   icon="users"   color="blue"   />
          <StatCard label="Docentes"   value={stats?.docentes ?? '—'}    icon="teacher" color="green"  />
          <StatCard label="Estudiantes" value={stats?.estudiantes ?? '—'} icon="student" color="purple" />
          <StatCard label="Pens. pend." value={stats?.pensionPend ?? '—'} icon="cash"    color="yellow" />
        </div>
      </div>

      {/* Gestiones y trimestres */}
      <div>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">Estado de gestiones</h2>
        <div className="space-y-3">
          {gestiones.length === 0 ? (
            <div className="rounded-xl border border-gray-100 bg-white py-8 text-center text-sm text-gray-400 shadow-sm">
              No hay gestiones registradas
            </div>
          ) : gestiones.map(g => {
            const cerrados = g.trimestres.filter(t => t.cerrado).length
            const total    = g.trimestres.length
            const todosC   = total > 0 && cerrados === total
            return (
              <div key={g.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-gray-900">Gestión {g.anno}</h3>
                    <Badge variant={g.activa ? 'success' : 'info'}>{g.activa ? 'Activa' : 'Inactiva'}</Badge>
                    <span className="text-sm text-gray-500">{cerrados}/{total} trimestres cerrados</span>
                  </div>
                  {g.activa && todosC && (
                    <Button
                      variant="danger"
                      size="sm"
                      loading={cerrando === g.id}
                      onClick={() => cerrarGestion(g.id)}
                    >
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
