import { Routes, Route, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { StatCard } from '../../components/ui/StatCard'
import { useAuth } from '../../context/AuthContext'
import { useGestionActiva } from '../../hooks/useGestionActiva'
import { useToast } from '../../components/ui/Toast'
import { Badge } from '@edusync/ui'
import { api } from '../../lib/api'
import { AvatarDisplay, AvatarPickerModal, useAvatar } from '../../components/ui/AvatarSelector'

import MisMateriasPage          from '../docente/MisMateriasPage'
import PlanillaPage             from '../docente/PlanillaPage'
import ObservacionesInicialPage from '../docente/ObservacionesInicialPage'
import AsistenciaClasePage      from '../docente/AsistenciaClasePage'
import DocenteEstudiantesPage   from '../docente/DocenteEstudiantesPage'
import TareasPage               from '../docente/TareasPage'
import PerfilEstudiantePage     from '../secretaria/PerfilEstudiantePage'
import AnunciosInternosPage     from '../shared/AnunciosInternosPage'
import MensajesPage             from '../shared/MensajesPage'

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
    <div className="space-y-6">

      {/* Profile card */}
      <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-5 flex items-start gap-5">
        <div className="relative">
          <AvatarDisplay userId={user?.id ?? ''} avatarId={avatarId} size="xl" />
          <button
            onClick={openPicker}
            className="absolute -bottom-1.5 -right-1.5 h-6 w-6 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center shadow hover:bg-indigo-700 transition-colors"
            title="Cambiar avatar"
          >✎</button>
        </div>

        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 leading-tight">
            Prof. {user?.nombre} {user?.apellido}
          </h1>
          <p className="text-sm text-gray-400 mt-0.5 truncate">{user?.email}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant="success">Docente</Badge>
            {gestionLabel && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{gestionLabel}</span>
            )}
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
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Mi actividad</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Mis materias — gestión {asignaciones[0]?.gestion.anno}
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {asignaciones.slice(0, 6).map(a => {
              const nivel = a.paralelo.grado.nivel.nombre
              const nivBg: Record<string, string> = {
                INICIAL: 'border-amber-200 bg-amber-50',
                PRIMARIA: 'border-sky-200 bg-sky-50',
                SECUNDARIA: 'border-violet-200 bg-violet-50',
              }
              const nivText: Record<string, string> = {
                INICIAL: 'text-amber-700', PRIMARIA: 'text-sky-700', SECUNDARIA: 'text-violet-700',
              }
              return (
                <div
                  key={a.id}
                  className={`rounded-xl border p-4 cursor-pointer hover:shadow-sm transition-all ${nivBg[nivel] ?? 'border-gray-200 bg-white'}`}
                  onClick={() => navigate(nivel === 'INICIAL'
                    ? `/dashboard/docente/inicial/${a.id}`
                    : `/dashboard/docente/planilla/${a.id}`)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs text-gray-400 truncate">{a.materia.campo.nombre}</p>
                      <p className={`font-semibold text-sm leading-tight mt-0.5 ${nivText[nivel] ?? 'text-gray-800'}`}>
                        {a.materia.nombre}
                      </p>
                    </div>
                    <span className={`text-xs font-bold shrink-0 px-2 py-0.5 rounded-full ${nivText[nivel] ?? ''} bg-white/60`}>
                      {a.paralelo.grado.nombre.match(/^(\d+°)/)?.[1] ?? a.paralelo.grado.nombre.slice(0,3)} {a.paralelo.letra}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
                    <span>👥 {a.n_estudiantes}</span>
                    <span>📊 {a._count.indicadores} indicadores</span>
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
        <Route path="calificaciones"            element={<MisMateriasPage />} />
        <Route path="asistencia"                element={<SectionPlaceholder title="Asistencia — selecciona una asignación desde Mis Materias" />} />
        <Route path="horario"                   element={<SectionPlaceholder title="Mi Horario" />} />
        <Route path="anuncios"                  element={<AnunciosInternosPage />} />
        <Route path="mensajes"                  element={<MensajesPage />} />
        <Route path="*"                         element={<DocenteHome />} />
      </Routes>
    </DashboardLayout>
  )
}
