import { Routes, Route, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef, lazy } from 'react'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { StatCard } from '../../components/ui/StatCard'
import { useAuth } from '../../context/AuthContext'
import { useGestionActiva } from '../../hooks/useGestionActiva'
import { useToast } from '../../components/ui/Toast'
import { Badge } from '@edusync/ui'
import { api } from '../../lib/api'
import { AvatarDisplay, AvatarPickerModal, useAvatar } from '../../components/ui/AvatarSelector'
import { EditarPerfilModal } from '../../components/EditarPerfilModal'

const MisMateriasPage          = lazy(() => import('../docente/MisMateriasPage'))
const PlanillaPage             = lazy(() => import('../docente/PlanillaPage'))
const CentralizadorAsignacionPage = lazy(() => import('../docente/CentralizadorAsignacionPage'))
const ObservacionesInicialPage = lazy(() => import('../docente/ObservacionesInicialPage'))
const AsistenciaClasePage      = lazy(() => import('../docente/AsistenciaClasePage'))
const DocenteAsistenciaPage    = lazy(() => import('../docente/DocenteAsistenciaPage'))
const ControlDiarioPage        = lazy(() => import('../docente/ControlDiarioPage'))
const ControlDiarioParaleloPage = lazy(() => import('../docente/ControlDiarioParaleloPage'))
const DocenteEstudiantesPage   = lazy(() => import('../docente/DocenteEstudiantesPage'))
const TareasPage               = lazy(() => import('../docente/TareasPage'))
const PerfilEstudiantePage     = lazy(() => import('../secretaria/PerfilEstudiantePage'))
const AnunciosInternosPage     = lazy(() => import('../shared/AnunciosInternosPage'))
const MensajesPage             = lazy(() => import('../shared/MensajesPage'))

interface AsignacionCard {
  id:            string
  materia:       { nombre: string; campo: { nombre: string } }
  paralelo:      { letra: string; grado: { nombre: string; nivel: { nombre: string } } }
  gestion:       { anno: number }
  _count:        { indicadores: number }
  n_estudiantes: number
}

// ─── Panel principal ──────────────────────────────────────────────────────────

function DocenteHome() {
  const { user }  = useAuth()
  const toast     = useToast()
  const toastRef  = useRef(toast)
  toastRef.current = toast
  const navigate  = useNavigate()
  const { gestionLabel, trimestreLabel } = useGestionActiva()
  const { avatarId, showPicker, openPicker, closePicker, onSaved } = useAvatar(user?.id ?? '')

  const [asignaciones, setAsignaciones] = useState<AsignacionCard[]>([])
  const [loadingStats, setLoadingStats] = useState(true)
  const [showEditPerfil, setShowEditPerfil] = useState(false)

  useEffect(() => {
    api.get<AsignacionCard[]>('/asignaciones/mias')
      .then(setAsignaciones)
      .catch(() => {})
      .finally(() => setLoadingStats(false))
  }, [])

  const totalMaterias   = new Set(asignaciones.map(a => a.materia.nombre)).size
  const totalParalelos  = new Set(asignaciones.map(a => a.paralelo.letra + a.paralelo.grado.nombre)).size
  const totalEstudiantes = asignaciones.reduce((s, a) => s + a.n_estudiantes, 0)

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
            {user?.grado_academico ? `${user.grado_academico} ` : 'Prof. '}{user?.nombre} {user?.apellido}
          </h1>
          <p className="text-sm text-fg-muted mt-0.5 truncate">{user?.email}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant="success">Docente</Badge>
            {gestionLabel && (
              <span className="text-xs text-fg-muted bg-surface-2 px-2 py-0.5 rounded-full">{gestionLabel}</span>
            )}
            <button
              onClick={() => setShowEditPerfil(true)}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
            >
              Editar mis datos
            </button>
          </div>
        </div>

        {trimestreLabel && (
          <div className="hidden sm:flex flex-col items-end rounded-xl bg-blue-50 border border-blue-100 px-4 py-2 text-right shrink-0">
            <p className="text-xs text-blue-500 font-medium">Trimestre activo</p>
            <p className="text-lg font-bold text-blue-700">{trimestreLabel}</p>
          </div>
        )}
      </div>

      {/* Stats */}
      <div>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-fg-muted">Mi actividad</h2>
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <StatCard
            label="Materias asignadas"
            value={loadingStats ? '…' : String(totalMaterias)}
            icon="book"
            color="blue"
          />
          <StatCard
            label="Paralelos"
            value={loadingStats ? '…' : String(totalParalelos)}
            icon="users"
            color="green"
          />
          <StatCard
            label="Total estudiantes"
            value={loadingStats ? '…' : String(totalEstudiantes)}
            icon="student"
            color="purple"
          />
        </div>
      </div>

      {/* Quick access to assignments */}
      {asignaciones.length > 0 && (
        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-fg-muted">
            Mis materias — gestión {asignaciones[0]?.gestion.anno}
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {asignaciones.slice(0, 6).map(a => {
              const nivel = a.paralelo.grado.nivel.nombre
              const nivBg: Record<string, string> = {
                INICIAL:    'border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30',
                PRIMARIA:   'border-sky-200 dark:border-sky-900 bg-sky-50 dark:bg-sky-950/30',
                SECUNDARIA: 'border-violet-200 dark:border-violet-900 bg-violet-50 dark:bg-violet-950/30',
              }
              const nivText: Record<string, string> = {
                INICIAL:    'text-amber-700 dark:text-amber-400',
                PRIMARIA:   'text-sky-700 dark:text-sky-400',
                SECUNDARIA: 'text-violet-700 dark:text-violet-400',
              }
              return (
                <div
                  key={a.id}
                  className={`glow-card group relative rounded-xl border p-3 cursor-pointer transition-transform hover:-translate-y-0.5 ${nivBg[nivel] ?? 'border-border bg-surface'}`}
                  onClick={() => navigate(nivel === 'INICIAL'
                    ? `/dashboard/docente/inicial/${a.id}`
                    : `/dashboard/docente/planilla/${a.id}`)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className={`font-semibold text-sm leading-tight truncate ${nivText[nivel] ?? 'text-fg'}`}>
                      {a.materia.nombre}
                    </p>
                    <span className={`text-xs font-bold shrink-0 px-2 py-0.5 rounded-full ${nivText[nivel] ?? ''} bg-surface/70`}>
                      {a.paralelo.grado.nombre.match(/^(\d+°)/)?.[1] ?? a.paralelo.grado.nombre.slice(0,3)} {a.paralelo.letra}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-fg-muted truncate">
                    <span className="truncate">{a.materia.campo.nombre}</span>
                    <span className="shrink-0">👥 {a.n_estudiantes}</span>
                    <span className="shrink-0">📊 {a._count.indicadores}</span>
                  </div>
                </div>
              )
            })}
          </div>
          {asignaciones.length > 6 && (
            <button
              onClick={() => navigate('/dashboard/docente/asignaciones')}
              className="mt-2 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Ver todas ({asignaciones.length}) →
            </button>
          )}
        </div>
      )}

      {showPicker && user && (
        <AvatarPickerModal userId={user.id} onClose={closePicker} onSaved={onSaved} />
      )}
      {showEditPerfil && (
        <EditarPerfilModal onClose={() => setShowEditPerfil(false)} />
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

// ─── Router docente ───────────────────────────────────────────────────────────

export default function DocenteDashboard() {
  return (
    <DashboardLayout>
      <Routes>
        <Route index                              element={<DocenteHome />} />
        <Route path="asignaciones"              element={<MisMateriasPage />} />
        <Route path="planilla/:asignacion_id"   element={<PlanillaPage />} />
        <Route path="planilla/:asignacion_id/centralizador" element={<CentralizadorAsignacionPage />} />
        <Route path="inicial/:asignacion_id"    element={<ObservacionesInicialPage />} />
        <Route path="asistencia/:asignacion_id" element={<AsistenciaClasePage />} />
        <Route path="tareas"                    element={<TareasPage />} />
        <Route path="estudiantes"               element={<DocenteEstudiantesPage />} />
        <Route path="estudiante/:id"            element={<PerfilEstudiantePage visibleTabs={['datos', 'calificaciones']} />} />
        <Route path="calificaciones"            element={<MisMateriasPage />} />
        <Route path="asistencia"                element={<DocenteAsistenciaPage />} />
        <Route path="control-diario"            element={<ControlDiarioPage />} />
        <Route path="control-diario/:paralelo_id" element={<ControlDiarioParaleloPage />} />
        <Route path="horario"                   element={<SectionPlaceholder title="Mi Horario" />} />
        <Route path="anuncios"                  element={<AnunciosInternosPage />} />
        <Route path="mensajes"                  element={<MensajesPage />} />
        <Route path="*"                         element={<DocenteHome />} />
      </Routes>
    </DashboardLayout>
  )
}
