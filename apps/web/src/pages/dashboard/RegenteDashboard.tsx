import { Routes, Route } from 'react-router-dom'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { StatCard } from '../../components/ui/StatCard'
import { useAuth } from '../../context/AuthContext'
import { Badge } from '@edusync/ui'
import { useGestionActiva } from '../../hooks/useGestionActiva'
import AsistenciaDiariaPage        from '../regente/AsistenciaDiariaPage'
import ReporteAsistenciaPage       from '../regente/ReporteAsistenciaPage'
import ComunicadosInasistenciaPage from '../regente/ComunicadosInasistenciaPage'
import RegenteEstudiantesPage      from '../regente/RegenteEstudiantesPage'
import PerfilEstudiantePage        from '../secretaria/PerfilEstudiantePage'
import AnunciosInternosPage        from '../shared/AnunciosInternosPage'
import MensajesPage                from '../shared/MensajesPage'

function RegenteHome() {
  const { user } = useAuth()
  const { gestionLabel, trimestreLabel } = useGestionActiva()

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Bienvenido, {user?.nombre} {user?.apellido}
          </h1>
          <div className="mt-1 flex items-center gap-2">
            <Badge variant="info">Regente</Badge>
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

      <div>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Resumen de hoy
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Paralelos activos" value="—" icon="users"   color="blue"   />
          <StatCard label="Asistencia hoy"    value="—" icon="chart"   color="green"  />
          <StatCard label="Alertas"           value="—" icon="bell"    color="yellow" />
        </div>
      </div>
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
