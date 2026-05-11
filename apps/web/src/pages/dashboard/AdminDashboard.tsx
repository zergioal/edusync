import { Routes, Route } from 'react-router-dom'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { StatCard } from '../../components/ui/StatCard'
import { useAuth } from '../../context/AuthContext'
import { ROL_LABELS } from '../../lib/roleRoutes'
import { Badge } from '@edusync/ui'

import { useGestionActiva } from '../../hooks/useGestionActiva'
import EstudiantesPage      from '../secretaria/EstudiantesPage'
import PerfilEstudiantePage from '../secretaria/PerfilEstudiantePage'
import GestionesPage        from '../secretaria/GestionesPage'
import DocentesPage         from '../secretaria/DocentesPage'
import ParalelosPage        from '../coordinador/ParalelosPage'
import AsignacionesPage     from '../coordinador/AsignacionesPage'
import PensionesPage        from '../contador/PensionesPage'
import MorosidadPage        from '../contador/MorosidadPage'
import EstadoCuentaPage     from '../contador/EstadoCuentaPage'
import TarifasPage          from '../contador/TarifasPage'
import ConfiguracionPage     from '../admin/ConfiguracionPage'
import InstitucionesPage     from '../admin/InstitucionesPage'
import AuditoriaPage         from '../admin/AuditoriaPage'
import AnunciosInternosPage  from '../shared/AnunciosInternosPage'
import MensajesPage          from '../shared/MensajesPage'

// ─── Panel principal ──────────────────────────────────────────────────────────

function AdminHome() {
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
          Resumen de la institución
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Estudiantes"     value="—" sublabel="matriculados"   icon="student"  color="blue"   />
          <StatCard label="Docentes"        value="—" sublabel="activos"        icon="teacher"  color="green"  />
          <StatCard label="Paralelos"       value="—" sublabel="en actividad"   icon="users"    color="purple" />
          <StatCard label="Pensiones pend." value="—" sublabel="por cobrar"     icon="cash"     color="yellow" />
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Actividad reciente
        </h2>
        <div className="rounded-xl border border-gray-100 bg-white divide-y divide-gray-50 shadow-sm">
          {[
            { text: 'Sistema listo para configurar',        time: 'ahora', dot: 'bg-green-400' },
            { text: 'Seed inicial ejecutado correctamente', time: 'hoy',   dot: 'bg-blue-400'  },
            { text: 'Base de datos sincronizada',           time: 'hoy',   dot: 'bg-blue-400'  },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3.5">
              <span className={`h-2 w-2 rounded-full flex-shrink-0 ${item.dot}`} />
              <p className="flex-1 text-sm text-gray-700">{item.text}</p>
              <span className="text-xs text-gray-400 whitespace-nowrap">{item.time}</span>
            </div>
          ))}
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

// ─── Router ───────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  return (
    <DashboardLayout>
      <Routes>
        <Route index element={<AdminHome />} />

        {/* Secretaría */}
        <Route path="estudiantes"      element={<EstudiantesPage />} />
        <Route path="estudiante/:id"   element={<PerfilEstudiantePage />} />
        <Route path="gestiones"        element={<GestionesPage />} />

        {/* Finanzas / Contador */}
        <Route path="finanzas"                      element={<PensionesPage />} />
        <Route path="finanzas/morosidad"             element={<MorosidadPage />} />
        <Route path="finanzas/tarifas"               element={<TarifasPage />} />
        <Route path="finanzas/estudiante/:id"        element={<EstadoCuentaPage />} />

        {/* Docentes */}
        <Route path="docentes"       element={<DocentesPage />} />

        {/* Académico (compartido con coordinador) */}
        <Route path="paralelos"      element={<ParalelosPage />} />
        <Route path="asignaciones"   element={<AsignacionesPage />} />
        <Route path="calificaciones" element={<SectionPlaceholder title="Calificaciones" />} />
        <Route path="asistencia"    element={<SectionPlaceholder title="Asistencia" />} />
        <Route path="horarios"      element={<SectionPlaceholder title="Horarios" />} />
        <Route path="instituciones" element={<InstitucionesPage />} />
        <Route path="auditoria"    element={<AuditoriaPage />} />
        <Route path="anuncios"      element={<AnunciosInternosPage />} />
        <Route path="mensajes"      element={<MensajesPage />} />
        <Route path="configuracion" element={<ConfiguracionPage />} />
        <Route path="*"             element={<AdminHome />} />
      </Routes>
    </DashboardLayout>
  )
}
