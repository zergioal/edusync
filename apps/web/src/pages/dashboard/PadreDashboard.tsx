import { Routes, Route } from 'react-router-dom'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { StatCard } from '../../components/ui/StatCard'
import { useAuth } from '../../context/AuthContext'
import { Badge } from '@edusync/ui'
import { useGestionActiva } from '../../hooks/useGestionActiva'
import CalificacionesHijoPage from '../padre/CalificacionesHijoPage'
import BoletinHijoPage        from '../padre/BoletinHijoPage'
import PagosHijoPage          from '../padre/PagosHijoPage'
import AsistenciaHijoPage     from '../padre/AsistenciaHijoPage'
import AnunciosInternosPage   from '../shared/AnunciosInternosPage'
import MensajesPage           from '../shared/MensajesPage'

function PadreHome() {
  const { user } = useAuth()
  const { gestionLabel } = useGestionActiva()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Bienvenido, {user?.nombre} {user?.apellido}
        </h1>
        <div className="mt-1 flex items-center gap-2">
          <Badge variant="warning">Padre/Tutor</Badge>
          {gestionLabel && <span className="text-sm text-gray-400">{gestionLabel}</span>}
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Resumen familiar
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Hijos registrados" value="—" icon="child"    color="blue"   />
          <StatCard label="Pensiones pend."   value="—" icon="cash"     color="yellow" />
          <StatCard label="Comunicados"       value="—" icon="bell"     color="purple" />
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Últimos comunicados
        </h2>
        <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
          <div className="px-5 py-12 text-center text-sm text-gray-400">
            No hay comunicados recientes
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Estado de pensiones
        </h2>
        <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
          <div className="px-5 py-12 text-center text-sm text-gray-400">
            Selecciona un hijo para ver sus pensiones
          </div>
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

export default function PadreDashboard() {
  return (
    <DashboardLayout>
      <Routes>
        <Route index element={<PadreHome />} />
        <Route path="hijos"     element={<SectionPlaceholder title="Mis Hijos" />} />
        <Route path="notas"     element={<CalificacionesHijoPage />} />
        <Route path="boletin"   element={<BoletinHijoPage />} />
        <Route path="pensiones"  element={<PagosHijoPage />} />
        <Route path="asistencia" element={<AsistenciaHijoPage />} />
        <Route path="anuncios"   element={<AnunciosInternosPage />} />
        <Route path="mensajes"   element={<MensajesPage />} />
        <Route path="*"         element={<PadreHome />} />
      </Routes>
    </DashboardLayout>
  )
}
