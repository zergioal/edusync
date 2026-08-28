import { lazy, useState, useEffect } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { StatCard } from '../../components/ui/StatCard'
import { QuickAccessCard } from '../../components/ui/QuickAccessCard'
import { useAuth } from '../../context/AuthContext'
import { Badge } from '@edusync/ui'
import { useGestionActiva } from '../../hooks/useGestionActiva'
import { api } from '../../lib/api'
import { AvatarDisplay, AvatarPickerModal, useAvatar } from '../../components/ui/AvatarSelector'
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
  const { avatarId, showPicker, openPicker, closePicker, onSaved } = useAvatar(user?.id ?? '')

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
    <div className="space-y-5">
      <div className="rounded-2xl bg-surface border border-border shadow-sm p-4 flex items-center gap-4">
        <div className="relative">
          <AvatarDisplay userId={user?.id ?? ''} avatarId={avatarId} size="xl" />
          <button
            onClick={openPicker}
            className="absolute -bottom-1.5 -right-1.5 h-6 w-6 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center shadow hover:bg-indigo-700 transition-colors"
            title="Cambiar avatar"
          >✎</button>
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-fg leading-tight">
            {user?.nombre} {user?.apellido}
          </h1>
          <p className="text-sm text-fg-muted mt-0.5 truncate">{user?.email}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant="warning">Padre/Tutor</Badge>
            {gestionLabel && <span className="text-sm text-fg-muted">{gestionLabel}</span>}
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-fg-muted">
          Resumen familiar
        </h2>
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
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
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-fg-muted">Acceso rápido</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
          <QuickAccessCard to="/dashboard/padre/hijos"      icon="child"    label="Mis Hijos"   color="blue"   />
          <QuickAccessCard to="/dashboard/padre/boletin"    icon="folder"   label="Boletín"     color="purple" />
          <QuickAccessCard to="/dashboard/padre/pensiones"  icon="cash"     label="Pensiones"   color="green"  />
          <QuickAccessCard to="/dashboard/padre/anuncios"   icon="bell"     label="Comunicados" color="yellow" />
          <QuickAccessCard to="/dashboard/padre/mensajes"   icon="users"    label="Mensajes"    color="red"    />
          <QuickAccessCard to="/dashboard/padre/calendario" icon="calendar" label="Calendario"  color="blue"   />
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-fg-muted">
          Últimos comunicados
        </h2>
        <div className="rounded-xl border border-border bg-surface shadow-sm divide-y divide-border overflow-hidden">
          {loadingAnuncios ? (
            <div className="px-5 py-12 text-center text-sm text-fg-muted">Cargando…</div>
          ) : anuncios.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-fg-muted">
              No hay comunicados recientes
            </div>
          ) : (
            anuncios.slice(0, 5).map(a => (
              <button
                key={a.id}
                onClick={() => navigate('/dashboard/padre/anuncios')}
                className="w-full text-left px-5 py-3 hover:bg-surface-2 transition-colors"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-fg truncate">
                    {a.destacado && <span className="mr-1.5 text-amber-500">★</span>}
                    {a.titulo}
                  </p>
                  <span className="flex-shrink-0 text-xs text-fg-muted">{fmt(a.publicado_en)}</span>
                </div>
                <p className="mt-0.5 truncate text-xs text-fg-muted">{a.contenido}</p>
              </button>
            ))
          )}
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-fg-muted">
          Estado de pensiones
        </h2>
        {hijos.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface shadow-sm px-5 py-12 text-center text-sm text-fg-muted">
            No hay hijos registrados en tu cuenta.
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-surface shadow-sm divide-y divide-border overflow-hidden">
            {hijos.map(h => (
              <button
                key={h.id}
                onClick={() => navigate(`/dashboard/padre/hijo/${h.id}`)}
                className="w-full flex items-center justify-between px-5 py-3 hover:bg-surface-2 transition-colors"
              >
                <span className="text-sm font-medium text-fg">{h.apellido}, {h.nombre}</span>
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

      {showPicker && user && (
        <AvatarPickerModal userId={user.id} onClose={closePicker} onSaved={onSaved} />
      )}
    </div>
  )
}

function SectionPlaceholder({ title }: { title: string }) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-fg">{title}</h1>
      <div className="rounded-xl border-2 border-dashed border-border bg-surface p-12 text-center">
        <p className="text-fg-muted">Módulo en construcción</p>
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
        <Route path="calendario" element={<SectionPlaceholder title="Calendario" />} />
        <Route path="*"         element={<PadreHome />} />
      </Routes>
    </DashboardLayout>
  )
}
