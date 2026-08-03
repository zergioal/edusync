import { lazy, useState, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { StatCard } from '../../components/ui/StatCard'
import { useAuth } from '../../context/AuthContext'
import { Badge } from '@edusync/ui'
import { useGestionActiva } from '../../hooks/useGestionActiva'
import { EditarPerfilModal } from '../../components/EditarPerfilModal'
import { api } from '../../lib/api'
const AsistenciaDiariaPage        = lazy(() => import('../regente/AsistenciaDiariaPage'))
const ReporteAsistenciaPage       = lazy(() => import('../regente/ReporteAsistenciaPage'))
const ComunicadosInasistenciaPage = lazy(() => import('../regente/ComunicadosInasistenciaPage'))
const RegenteEstudiantesPage      = lazy(() => import('../regente/RegenteEstudiantesPage'))
const PerfilEstudiantePage        = lazy(() => import('../secretaria/PerfilEstudiantePage'))
const AnunciosInternosPage        = lazy(() => import('../shared/AnunciosInternosPage'))
const MensajesPage                = lazy(() => import('../shared/MensajesPage'))

interface RegenteStats {
  paralelos: number
  presentes: number
  ausentes:  number
}

function RegenteHome() {
  const { user } = useAuth()
  const { gestionLabel, trimestreLabel } = useGestionActiva()
  const [showEditPerfil, setShowEditPerfil] = useState(false)
  const [stats,        setStats]        = useState<RegenteStats | null>(null)
  const [loadingStats, setLoadingStats] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get<{ activo: boolean }[]>('/paralelos').catch(() => []),
      api.get<{ presentes: number; ausentes: number; tardanzas: number }>('/asistencia/resumen-hoy')
        .catch(() => ({ presentes: 0, ausentes: 0, tardanzas: 0 })),
    ]).then(([paralelos, resumen]) => {
      setStats({
        paralelos: paralelos.filter(p => p.activo).length,
        presentes: resumen.presentes,
        ausentes:  resumen.ausentes,
      })
    }).finally(() => setLoadingStats(false))
  }, [])

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Bienvenido, {user?.grado_academico ? `${user.grado_academico} ` : ''}{user?.nombre} {user?.apellido}
          </h1>
          <div className="mt-1 flex items-center gap-2">
            <Badge variant="info">Regente</Badge>
            {gestionLabel && <span className="text-sm text-gray-400">{gestionLabel}</span>}
            <button
              onClick={() => setShowEditPerfil(true)}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
            >
              Editar mis datos
            </button>
          </div>
        </div>
        {trimestreLabel && (
          <div className="rounded-xl bg-blue-50 px-4 py-2 text-right">
            <p className="text-xs text-blue-500 font-medium">Trimestre activo</p>
            <p className="text-lg font-bold text-blue-700">{trimestreLabel}</p>
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Resumen de hoy
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Paralelos activos" value={loadingStats ? '…' : (stats?.paralelos ?? '—')} icon="users" color="blue"  />
          <StatCard label="Asistencia hoy"    value={loadingStats ? '…' : (stats?.presentes ?? '—')} icon="chart" color="green" sublabel="presentes" />
          <StatCard label="Alertas"           value={loadingStats ? '…' : (stats?.ausentes  ?? '—')} icon="bell"  color="yellow" sublabel="faltas hoy" />
        </div>
      </div>

      {showEditPerfil && (
        <EditarPerfilModal onClose={() => setShowEditPerfil(false)} />
      )}
    </div>
  )
}

export default function RegenteDashboard() {
  return (
    <DashboardLayout>
      <Routes>
        <Route index                   element={<RegenteHome />} />
        <Route path="asistencia"       element={<AsistenciaDiariaPage />} />
        <Route path="reporte"          element={<ReporteAsistenciaPage />} />
        <Route path="inasistencias"    element={<ComunicadosInasistenciaPage />} />
        <Route path="estudiantes"      element={<RegenteEstudiantesPage />} />
        <Route path="estudiante/:id"   element={<PerfilEstudiantePage visibleTabs={['asistencia', 'pensiones']} />} />
        <Route path="anuncios"         element={<AnunciosInternosPage />} />
        <Route path="mensajes"         element={<MensajesPage />} />
        <Route path="*"                element={<RegenteHome />} />
      </Routes>
    </DashboardLayout>
  )
}
