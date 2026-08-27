import { lazy, useState, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { StatCard } from '../../components/ui/StatCard'
import { useAuth } from '../../context/AuthContext'
import { ROL_LABELS } from '../../lib/roleRoutes'
import { api } from '../../lib/api'
import { Badge } from '@edusync/ui'
import { EditarPerfilModal } from '../../components/EditarPerfilModal'

import { useGestionActiva } from '../../hooks/useGestionActiva'
const EstudiantesPage      = lazy(() => import('../secretaria/EstudiantesPage'))
const PerfilEstudiantePage = lazy(() => import('../secretaria/PerfilEstudiantePage'))
const GestionesPage        = lazy(() => import('../secretaria/GestionesPage'))
const DocentesPage         = lazy(() => import('../secretaria/DocentesPage'))
const ParalelosPage        = lazy(() => import('../coordinador/ParalelosPage'))
const AsignacionesPage     = lazy(() => import('../coordinador/AsignacionesPage'))
const PensionesPage        = lazy(() => import('../contador/PensionesPage'))
const MorosidadPage        = lazy(() => import('../contador/MorosidadPage'))
const EstadoCuentaPage     = lazy(() => import('../contador/EstadoCuentaPage'))
const TarifasPage          = lazy(() => import('../contador/TarifasPage'))
const ConfiguracionPage    = lazy(() => import('../admin/ConfiguracionPage'))
const InstitucionesPage    = lazy(() => import('../admin/InstitucionesPage'))
const AuditoriaPage        = lazy(() => import('../admin/AuditoriaPage'))
const AnunciosInternosPage = lazy(() => import('../shared/AnunciosInternosPage'))
const MensajesPage         = lazy(() => import('../shared/MensajesPage'))
const PadresPage           = lazy(() => import('../secretaria/PadresPage'))

// ─── Panel principal ──────────────────────────────────────────────────────────

interface AdminStats {
  estudiantes: number
  docentes:    number
  paralelos:   number
  pensionPend: number
}

interface AnuncioResumen {
  id:           string
  titulo:       string
  contenido:    string
  publicado_en: string
  destacado:    boolean
}

function AdminHome() {
  const { user } = useAuth()
  const { gestionLabel, trimestreLabel } = useGestionActiva()
  const [showEditPerfil, setShowEditPerfil] = useState(false)

  const [stats,        setStats]        = useState<AdminStats | null>(null)
  const [loadingStats, setLoadingStats] = useState(true)
  const [anuncios,        setAnuncios]        = useState<AnuncioResumen[]>([])
  const [loadingAnuncios, setLoadingAnuncios] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get<unknown[]>('/estudiantes').catch(() => []),
      api.get<unknown[]>('/docentes').catch(() => []),
      api.get<{ activo: boolean }[]>('/paralelos').catch(() => []),
      api.get<unknown[]>('/pensiones/morosidad').catch(() => []),
    ]).then(([estudiantes, docentes, paralelos, morosidad]) => {
      setStats({
        estudiantes: estudiantes.length,
        docentes:    docentes.length,
        paralelos:   paralelos.filter(p => p.activo).length,
        pensionPend: morosidad.length,
      })
    }).finally(() => setLoadingStats(false))

    api.get<AnuncioResumen[]>('/anuncios')
      .then(setAnuncios)
      .catch(() => {})
      .finally(() => setLoadingAnuncios(false))
  }, [])

  function fmt(s: string) {
    return new Date(s).toLocaleDateString('es-BO', { day: '2-digit', month: 'short' })
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-fg">
            Bienvenido, {user?.grado_academico ? `${user.grado_academico} ` : ''}{user?.nombre} {user?.apellido}
          </h1>
          <div className="mt-1 flex items-center gap-2">
            <Badge variant="info">{user?.rol ? ROL_LABELS[user.rol] : ''}</Badge>
            {gestionLabel && <span className="text-sm text-fg-muted">{gestionLabel}</span>}
            <button
              onClick={() => setShowEditPerfil(true)}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
            >
              Editar mis datos
            </button>
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
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-fg-muted">
          Resumen de la institución
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Estudiantes"     value={loadingStats ? '…' : (stats?.estudiantes ?? '—')} sublabel="matriculados"   icon="student"  color="blue"   />
          <StatCard label="Docentes"        value={loadingStats ? '…' : (stats?.docentes    ?? '—')} sublabel="activos"        icon="teacher"  color="green"  />
          <StatCard label="Paralelos"       value={loadingStats ? '…' : (stats?.paralelos   ?? '—')} sublabel="en actividad"   icon="users"    color="purple" />
          <StatCard label="Pensiones pend." value={loadingStats ? '…' : (stats?.pensionPend ?? '—')} sublabel="por cobrar"     icon="cash"     color="yellow" />
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-fg-muted">
          Últimos comunicados
        </h2>
        <div className="rounded-xl border border-border bg-surface divide-y divide-border shadow-sm overflow-hidden">
          {loadingAnuncios ? (
            <div className="px-5 py-12 text-center text-sm text-fg-muted">Cargando…</div>
          ) : anuncios.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-fg-muted">No hay comunicados recientes</div>
          ) : (
            anuncios.slice(0, 5).map(a => (
              <div key={a.id} className="flex items-center gap-4 px-5 py-3.5">
                <span className={`h-2 w-2 rounded-full flex-shrink-0 ${a.destacado ? 'bg-amber-400' : 'bg-blue-400'}`} />
                <p className="flex-1 text-sm text-fg truncate">{a.titulo}</p>
                <span className="text-xs text-fg-muted whitespace-nowrap">{fmt(a.publicado_en)}</span>
              </div>
            ))
          )}
        </div>
      </div>

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

        {/* Docentes y Padres */}
        <Route path="docentes"       element={<DocentesPage />} />
        <Route path="padres"         element={<PadresPage />} />

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
