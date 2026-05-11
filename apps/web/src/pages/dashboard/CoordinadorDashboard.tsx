import { Routes, Route } from 'react-router-dom'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { StatCard } from '../../components/ui/StatCard'
import { useAuth } from '../../context/AuthContext'
import { ROL_LABELS } from '../../lib/roleRoutes'
import { Badge } from '@edusync/ui'

import { useGestionActiva } from '../../hooks/useGestionActiva'
import ParalelosPage        from '../coordinador/ParalelosPage'
import AsignacionesPage     from '../coordinador/AsignacionesPage'
import HorariosPage         from '../coordinador/HorariosPage'
import ReportesPage         from '../coordinador/ReportesPage'
import GestionesPage        from '../secretaria/GestionesPage'
import DocentesPage         from '../secretaria/DocentesPage'
import EstudiantesPage      from '../secretaria/EstudiantesPage'
import PerfilEstudiantePage from '../secretaria/PerfilEstudiantePage'
import AnunciosInternosPage from '../shared/AnunciosInternosPage'
import MensajesPage         from '../shared/MensajesPage'

// ─── Panel principal ──────────────────────────────────────────────────────────

function CoordinadorHome() {
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
            <Badge variant="info">{user?.rol ? ROL_LABELS[user.rol] : ''}</Badge>
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
          Resumen académico
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Paralelos"    value="—" sublabel="activos"             icon="users"    color="blue"   />
          <StatCard label="Docentes"     value="—" sublabel="con asignaciones"    icon="teacher"  color="green"  />
          <StatCard label="Asignaciones" value="—" sublabel="este trimestre"      icon="book"     color="purple" />
          <StatCard label="Sin asesor"   value="—" sublabel="paralelos sin tutor" icon="student"  color="yellow" />
        </div>
      </div>
    </div>
  )
}

// ─── Router coordinador ───────────────────────────────────────────────────────

export default function CoordinadorDashboard() {
  return (
    <DashboardLayout>
      <Routes>
        <Route index                   element={<CoordinadorHome />} />
        <Route path="paralelos"        element={<ParalelosPage />} />
        <Route path="asignaciones"     element={<AsignacionesPage />} />
        <Route path="horarios"         element={<HorariosPage />} />
        <Route path="reportes/*"       element={<ReportesPage />} />
        <Route path="gestiones"        element={<GestionesPage />} />
        <Route path="docentes"         element={<DocentesPage />} />
        <Route path="estudiantes"      element={<EstudiantesPage basePath="/dashboard/coordinador" />} />
        <Route path="estudiante/:id"   element={<PerfilEstudiantePage />} />
        <Route path="anuncios"         element={<AnunciosInternosPage />} />
        <Route path="mensajes"         element={<MensajesPage />} />
        <Route path="*"                element={<CoordinadorHome />} />
      </Routes>
    </DashboardLayout>
  )
}
