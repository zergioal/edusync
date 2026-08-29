import { lazy, useEffect, useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { StatCard } from '../../components/ui/StatCard'
import { QuickAccessCard } from '../../components/ui/QuickAccessCard'
import { useAuth } from '../../context/AuthContext'
import { useGestionActiva } from '../../hooks/useGestionActiva'
import { Badge } from '@edusync/ui'
import { api } from '../../lib/api'
import { AvatarDisplay, AvatarPickerModal, useAvatar } from '../../components/ui/AvatarSelector'
const MisCalificacionesPage = lazy(() => import('../estudiante/MisCalificacionesPage'))
const MiBoletinPage         = lazy(() => import('../estudiante/MiBoletinPage'))
const MiAsistenciaPage      = lazy(() => import('../estudiante/MiAsistenciaPage'))
const MiControlDiarioPage   = lazy(() => import('../estudiante/MiControlDiarioPage'))
const MisTareasPage         = lazy(() => import('../estudiante/MisTareasPage'))
const AnunciosInternosPage  = lazy(() => import('../shared/AnunciosInternosPage'))
const MensajesPage          = lazy(() => import('../shared/MensajesPage'))

type Escala = 'ED' | 'DA' | 'DO' | 'DP'
interface HomeStats {
  nivel:         string
  promedio:      number | null
  materias_bajo: number
  faltas:        number
}

const ESCALA_LABEL: Record<Escala, string> = {
  ED: 'En Desarrollo', DA: 'Debe Alcanzar',
  DO: 'Desarrollado',  DP: 'Destacado',
}
const ESCALA_COLOR: Record<Escala, string> = {
  ED: 'bg-red-100 text-red-700',     DA: 'bg-orange-100 text-orange-700',
  DO: 'bg-green-100 text-green-700', DP: 'bg-emerald-100 text-emerald-700',
}

function EstudianteHome() {
  const { user, estadoFinanciero } = useAuth()
  const [stats, setStats] = useState<HomeStats | null>(null)
  const [escala, setEscala] = useState<Escala | null>(null)
  const estId = estadoFinanciero?.hijos?.[0]?.id
  const { trimestreActual } = useGestionActiva()
  const { avatarId, showPicker, openPicker, closePicker, onSaved } = useAvatar(user?.id ?? '')

  useEffect(() => {
    if (!estId || !trimestreActual) return
    let cancelled = false

    api.get<{
      tipo: 'REGULAR' | 'INICIAL'
      estudiante: { nivel: string }
      materias?: Array<{ total: number }>
      promedio_general?: number
      escala_general?: Escala
      total_faltas: number
    }>(`/boletines/${estId}?trimestre_id=${trimestreActual.id}`)
      .then(boletin => {
        if (cancelled) return
        if (boletin.tipo === 'REGULAR') {
          setStats({
            nivel:         boletin.estudiante.nivel,
            promedio:      boletin.promedio_general ?? null,
            materias_bajo: (boletin.materias ?? []).filter(m => m.total <= 50).length,
            faltas:        boletin.total_faltas,
          })
          setEscala(boletin.escala_general ?? null)
        } else {
          setStats({ nivel: boletin.estudiante.nivel, promedio: null, materias_bajo: 0, faltas: boletin.total_faltas })
        }
      })
      .catch(() => {})

    return () => { cancelled = true }
  }, [estId, trimestreActual])

  const nivelColors: Record<string, string> = {
    INICIAL: 'bg-amber-100 text-amber-700',
    PRIMARIA: 'bg-sky-100 text-sky-700',
    SECUNDARIA: 'bg-violet-100 text-violet-700',
  }

  return (
    <div className="space-y-4">

      {/* Profile card */}
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
            <Badge variant="default">Estudiante</Badge>
            {stats?.nivel && (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${nivelColors[stats.nivel] ?? 'bg-surface-2 text-fg-muted'}`}>
                {stats.nivel}
              </span>
            )}
            {escala && (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ESCALA_COLOR[escala]}`}>
                {ESCALA_LABEL[escala]}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-fg-muted">
          Situación académica — trimestre actual
        </h2>
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <StatCard
            label="Promedio general"
            value={stats?.promedio != null ? String(stats.promedio) : '—'}
            icon="chart"
            color="green"
          />
          <StatCard
            label="Materias por mejorar"
            value={stats != null ? String(stats.materias_bajo) : '—'}
            icon="book"
            color={stats?.materias_bajo ? 'yellow' : 'blue'}
          />
          <StatCard
            label="Faltas este trimestre"
            value={stats != null ? String(stats.faltas) : '—'}
            icon="calendar"
            color={stats?.faltas ? 'yellow' : 'green'}
          />
        </div>
      </div>

      {/* Quick links */}
      <div>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-fg-muted">Acceso rápido</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <QuickAccessCard to="/dashboard/estudiante/notas"      icon="book"     label="Mis Notas"  color="blue"   />
          <QuickAccessCard to="/dashboard/estudiante/asistencia" icon="calendar" label="Asistencia" color="green"  />
          <QuickAccessCard to="/dashboard/estudiante/tareas"     icon="tasks"    label="Tareas"     color="yellow" />
          <QuickAccessCard to="/dashboard/estudiante/boletin"    icon="folder"   label="Mi Boletín" color="purple" />
        </div>
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

export default function EstudianteDashboard() {
  return (
    <DashboardLayout>
      <Routes>
        <Route index element={<EstudianteHome />} />
        <Route path="notas"      element={<MisCalificacionesPage />} />
        <Route path="boletin"    element={<MiBoletinPage />} />
        <Route path="asistencia" element={<MiAsistenciaPage />} />
        <Route path="control-diario" element={<MiControlDiarioPage />} />
        <Route path="tareas"     element={<MisTareasPage />} />
        <Route path="horario"    element={<SectionPlaceholder title="Mi Horario" />} />
        <Route path="anuncios"   element={<AnunciosInternosPage />} />
        <Route path="mensajes"   element={<MensajesPage />} />
        <Route path="*"          element={<EstudianteHome />} />
      </Routes>
    </DashboardLayout>
  )
}
