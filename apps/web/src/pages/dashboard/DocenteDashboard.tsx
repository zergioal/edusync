import { Routes, Route } from 'react-router-dom'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { StatCard } from '../../components/ui/StatCard'
import { useAuth } from '../../context/AuthContext'
import { Badge } from '@edusync/ui'

import { useGestionActiva } from '../../hooks/useGestionActiva'
import MisMateriasPage          from '../docente/MisMateriasPage'
import PlanillaPage             from '../docente/PlanillaPage'
import ObservacionesInicialPage from '../docente/ObservacionesInicialPage'
import AsistenciaClasePage      from '../docente/AsistenciaClasePage'
import DocenteEstudiantesPage   from '../docente/DocenteEstudiantesPage'
import TareasPage               from '../docente/TareasPage'
import PerfilEstudiantePage     from '../secretaria/PerfilEstudiantePage'
import AnunciosInternosPage     from '../shared/AnunciosInternosPage'
import MensajesPage             from '../shared/MensajesPage'

// ─── Panel principal ──────────────────────────────────────────────────────────

function DocenteHome() {
  const { user } = useAuth()
  const { gestionLabel, trimestreLabel } = useGestionActiva()

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Prof. {user?.nombre} {user?.apellido}
          </h1>
          <div className="mt-1 flex items-center gap-2">
            <Badge variant="success">Docente</Badge>
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
          Mi actividad
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Materias asignadas" value="—" icon="book"    color="blue"   />
          <StatCard label="Paralelos"           value="—" icon="users"   color="green"  />
          <StatCard label="Indicadores pend."   value="—" icon="chart"   color="yellow" />
        </div>
      </div>
    </div>
  )
}

function SectionPlaceholder({ title }: { title: string }) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white p-12 text-center">
        <p className="text-gray-400">Módulo en construcción</p>
      </div>
    </div>
  )
}

// ─── Router docente ───────────────────────────────────────────────────────────

export default function DocenteDashboard() {
  return (
    <DashboardLayout>
      <Routes>
        <Route index                              element={<DocenteHome />} />
        <Route path="asignaciones"              element={<MisMateriasPage />} />
        <Route path="planilla/:asignacion_id"   element={<PlanillaPage />} />
        <Route path="inicial/:asignacion_id"    element={<ObservacionesInicialPage />} />
        <Route path="asistencia/:asignacion_id" element={<AsistenciaClasePage />} />
        <Route path="tareas"                    element={<TareasPage />} />
        <Route path="estudiantes"               element={<DocenteEstudiantesPage />} />
        <Route path="estudiante/:id"            element={<PerfilEstudiantePage visibleTabs={['calificaciones']} />} />
        <Route path="calificaciones" element={<SectionPlaceholder title="Calificaciones" />} />
        <Route path="asistencia"     element={<SectionPlaceholder title="Asistencia — selecciona una asignación" />} />
        <Route path="horario"        element={<SectionPlaceholder title="Mi Horario" />} />
        <Route path="anuncios"       element={<AnunciosInternosPage />} />
        <Route path="mensajes"       element={<MensajesPage />} />
        <Route path="*"              element={<DocenteHome />} />
      </Routes>
    </DashboardLayout>
  )
}
