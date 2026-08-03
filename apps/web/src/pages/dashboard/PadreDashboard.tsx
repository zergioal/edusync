import { lazy, useState, useEffect } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { StatCard } from '../../components/ui/StatCard'
import { useAuth } from '../../context/AuthContext'
import { Badge } from '@edusync/ui'
import { useGestionActiva } from '../../hooks/useGestionActiva'
import { api } from '../../lib/api'
const CalificacionesHijoPage = lazy(() => import('../padre/CalificacionesHijoPage'))
const BoletinHijoPage        = lazy(() => import('../padre/BoletinHijoPage'))
const PagosHijoPage          = lazy(() => import('../padre/PagosHijoPage'))
const AsistenciaHijoPage     = lazy(() => import('../padre/AsistenciaHijoPage'))
const MisHijosPage           = lazy(() => import('../padre/MisHijosPage'))
const HijoDetallePage        = lazy(() => import('../padre/HijoDetallePage'))
const AnunciosInternosPage   = lazy(() => import('../shared/AnunciosInternosPage'))
const MensajesPage           = lazy(() => import('../shared/MensajesPage'))

interface AnuncioResumen {
  id:           string
  titulo:       string
  contenido:    string
  publicado_en: string
  destacado:    boolean
}

function PadreHome() {
  const navigate = useNavigate()
  const { user, estadoFinanciero } = useAuth()
  const { gestionLabel } = useGestionActiva()

  const [anuncios,        setAnuncios]        = useState<AnuncioResumen[]>([])
  const [loadingAnuncios, setLoadingAnuncios]  = useState(true)

  useEffect(() => {
    api.get<AnuncioResumen[]>('/anuncios')
      .then(setAnuncios)
      .catch(() => {})
      .finally(() => setLoadingAnuncios(false))
  }, [])

  const hijos            = estadoFinanciero?.hijos ?? []
  const hijosPendientes  = hijos.filter(h => h.bloqueado)

  function fmt(s: string) {
    return new Date(s).toLocaleDateString('es-BO', { day: '2-digit', month: 'short' })
  }

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
          <StatCard label="Hijos registrados" value={hijos.length} icon="child" color="blue" />
          <StatCard
            label="Pensiones pend."
            value={hijosPendientes.length}
            icon="cash"
            color={hijosPendientes.length > 0 ? 'red' : 'green'}
          />
          <StatCard
            label="Comunicados"
            value={loadingAnuncios ? '…' : anuncios.length}
            icon="bell"
            color="purple"
          />
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Últimos comunicados
        </h2>
        <div className="rounded-xl border border-gray-100 bg-white shadow-sm divide-y divide-gray-50 overflow-hidden">
          {loadingAnuncios ? (
            <div className="px-5 py-12 text-center text-sm text-gray-400">Cargando…</div>
          ) : anuncios.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-gray-400">
              No hay comunicados recientes
            </div>
          ) : (
            anuncios.slice(0, 5).map(a => (
              <button
                key={a.id}
                onClick={() => navigate('/dashboard/padre/anuncios')}
                className="w-full text-left px-5 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {a.destacado && <span className="mr-1.5 text-amber-500">★</span>}
                    {a.titulo}
                  </p>
                  <span className="flex-shrink-0 text-xs text-gray-400">{fmt(a.publicado_en)}</span>
                </div>
                <p className="mt-0.5 truncate text-xs text-gray-400">{a.contenido}</p>
              </button>
            ))
          )}
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Estado de pensiones
        </h2>
        {hijos.length === 0 ? (
          <div className="rounded-xl border border-gray-100 bg-white shadow-sm px-5 py-12 text-center text-sm text-gray-400">
            No hay hijos registrados en tu cuenta.
          </div>
        ) : (
          <div className="rounded-xl border border-gray-100 bg-white shadow-sm divide-y divide-gray-50 overflow-hidden">
            {hijos.map(h => (
              <button
                key={h.id}
                onClick={() => navigate(`/dashboard/padre/hijo/${h.id}`)}
                className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
              >
                <span className="text-sm font-medium text-gray-800">{h.apellido}, {h.nombre}</span>
                {h.becado
                  ? <Badge variant="info">Becado</Badge>
                  : h.bloqueado
                    ? <Badge variant="danger">Bs {h.monto_pendiente.toFixed(2)} pendiente</Badge>
                    : <Badge variant="success">Al día</Badge>}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function PadreDashboard() {
  return (
    <DashboardLayout>
      <Routes>
        <Route index element={<PadreHome />} />
        <Route path="hijos"     element={<MisHijosPage />} />
        <Route path="hijo/:id"  element={<HijoDetallePage />} />
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
