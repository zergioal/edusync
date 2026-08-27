import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { Spinner, Badge } from '@edusync/ui'
import { ROL_LABELS } from '../../lib/roleRoutes'

// ─── Vista: actividad de staff ──────────────────────────────────────────────

interface UltimaAccion {
  recurso:   string
  accion:    'CREATE' | 'UPDATE' | 'DELETE'
  creado_en: string
}

interface StaffItem {
  id:              string
  nombre:          string
  apellido:        string
  rol:             keyof typeof ROL_LABELS
  activo:          boolean
  ultima_conexion: string | null
  ultima_accion:   UltimaAccion | null
}

const ACCION_LABELS: Record<string, string> = {
  notas:         'Registró notas',
  indicadores:   'Gestionó indicadores',
  tareas:        'Envió una tarea',
  asistencia:    'Registró asistencia',
  anuncios:      'Publicó un comunicado',
  mensajes:      'Envió un mensaje',
  estudiantes:   'Actualizó un estudiante',
  docentes:      'Actualizó un docente',
  padres:        'Actualizó un padre/tutor',
  matriculas:    'Gestionó una matrícula',
  pensiones:     'Registró un pago',
  boletines:     'Generó un boletín',
  configuracion: 'Actualizó la configuración',
  inicial:       'Registró una observación',
  paralelos:     'Gestionó un paralelo',
  asignaciones:  'Gestionó una asignación',
  gestiones:     'Gestionó la gestión académica',
  trimestres:    'Gestionó un trimestre',
  materias:      'Gestionó una materia',
}

function labelAccion(a: UltimaAccion): string {
  if (a.accion === 'DELETE') return `Eliminó registro en ${a.recurso}`
  return ACCION_LABELS[a.recurso] ?? `${a.accion === 'CREATE' ? 'Creó' : 'Actualizó'} en ${a.recurso}`
}

function relativo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diffMs / 60000)
  if (min < 1)  return 'Hace un momento'
  if (min < 60) return `Hace ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `Hace ${h} h`
  const d = Math.floor(h / 24)
  if (d < 30) return `Hace ${d} d`
  return new Date(iso).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' })
}

function StaffTable() {
  const [staff,   setStaff]   = useState<StaffItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<StaffItem[]>('/auditoria/staff')
      .then(setStaff)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>
  if (staff.length === 0) {
    return <div className="py-12 text-center text-sm text-fg-muted">Sin docentes ni administrativos registrados</div>
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border bg-bg text-xs font-semibold uppercase tracking-wide text-fg-muted">
          <th className="px-5 py-3 text-left">Nombre</th>
          <th className="px-5 py-3 text-left">Rol</th>
          <th className="px-5 py-3 text-left">Última conexión</th>
          <th className="px-5 py-3 text-left">Última acción</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {staff.map(s => (
          <tr key={s.id} className="hover:bg-surface-2 transition-colors">
            <td className="px-5 py-3 font-medium text-fg">
              {s.apellido}, {s.nombre}
              {!s.activo && <Badge variant="danger">Inactivo</Badge>}
            </td>
            <td className="px-5 py-3 text-fg-muted">{ROL_LABELS[s.rol] ?? s.rol}</td>
            <td className="px-5 py-3 text-fg-muted">
              {s.ultima_conexion ? relativo(s.ultima_conexion) : <span className="text-fg-muted italic">Nunca</span>}
            </td>
            <td className="px-5 py-3 text-fg-muted">
              {s.ultima_accion
                ? <>
                    <span>{labelAccion(s.ultima_accion)}</span>
                    <span className="ml-1.5 text-xs text-fg-muted">· {relativo(s.ultima_accion.creado_en)}</span>
                  </>
                : <span className="text-fg-muted italic">Sin actividad registrada</span>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ─── Vista: registro detallado (log crudo) ──────────────────────────────────

interface LogEntry {
  id:             string
  usuario_id:     string | null
  accion:         string
  recurso:        string
  recurso_id:     string | null
  ip:             string | null
  creado_en:      string
  detalle:        Record<string, unknown> | null
}

const ACCION_VARIANT: Record<string, 'success' | 'warning' | 'danger'> = {
  CREATE: 'success',
  UPDATE: 'warning',
  DELETE: 'danger',
}

function RegistroDetallado() {
  const [logs,     setLogs]     = useState<LogEntry[]>([])
  const [loading,  setLoading]  = useState(true)
  const [recurso,  setRecurso]  = useState('')
  const [accion,   setAccion]   = useState('')
  const [page,     setPage]     = useState(1)
  const [hasMore,  setHasMore]  = useState(false)

  async function cargar(reset = false) {
    const p = reset ? 1 : page
    if (reset) setPage(1)
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(p), limit: '50' })
      if (recurso) params.set('recurso', recurso)
      if (accion)  params.set('accion', accion)
      const data = await api.get<LogEntry[]>(`/auditoria?${params}`)
      setLogs(reset ? data : prev => [...prev, ...data])
      setHasMore(data.length === 50)
    } catch { /* silencioso */ }
    finally { setLoading(false) }
  }

  useEffect(() => { cargar(true) }, [recurso, accion])

  function fmt(s: string) {
    return new Date(s).toLocaleString('es-BO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-3 rounded-xl border border-border bg-surface p-4 shadow-sm">
        <input
          type="text"
          placeholder="Filtrar por recurso..."
          value={recurso}
          onChange={e => setRecurso(e.target.value)}
          className="rounded-lg border border-border px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand"
        />
        <select
          value={accion}
          onChange={e => setAccion(e.target.value)}
          className="rounded-lg border border-border px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand"
        >
          <option value="">Todas las acciones</option>
          <option value="CREATE">CREATE</option>
          <option value="UPDATE">UPDATE</option>
          <option value="DELETE">DELETE</option>
        </select>
      </div>

      {/* Tabla */}
      <div className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
        {loading && logs.length === 0 ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : logs.length === 0 ? (
          <div className="py-12 text-center text-sm text-fg-muted">Sin registros de auditoría</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-bg text-xs font-semibold uppercase tracking-wide text-fg-muted">
                <th className="px-5 py-3 text-left">Fecha</th>
                <th className="px-5 py-3 text-left">Acción</th>
                <th className="px-5 py-3 text-left">Recurso</th>
                <th className="px-5 py-3 text-left">ID Recurso</th>
                <th className="px-5 py-3 text-left">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs.map(l => (
                <tr key={l.id} className="hover:bg-surface-2 transition-colors">
                  <td className="px-5 py-3 text-fg-muted whitespace-nowrap">{fmt(l.creado_en)}</td>
                  <td className="px-5 py-3">
                    <Badge variant={ACCION_VARIANT[l.accion] ?? 'info'}>{l.accion}</Badge>
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-fg">{l.recurso}</td>
                  <td className="px-5 py-3 font-mono text-xs text-fg-muted truncate max-w-[120px]">{l.recurso_id ?? '—'}</td>
                  <td className="px-5 py-3 text-xs text-fg-muted">{l.ip ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {hasMore && !loading && (
          <div className="flex justify-center py-4 border-t border-border">
            <button
              onClick={() => { setPage(p => p + 1); cargar() }}
              className="text-sm text-blue-600 hover:underline"
            >
              Cargar más
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function AuditoriaPage() {
  const [vista, setVista] = useState<'staff' | 'log'>('staff')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-fg">Auditoría del Sistema</h1>
          <p className="text-sm text-fg-muted mt-0.5">
            {vista === 'staff' ? 'Actividad de docentes y administrativos' : 'Registro detallado de acciones'}
          </p>
        </div>
        <div className="flex gap-1 rounded-xl bg-surface-2 p-1 w-fit">
          {([
            { key: 'staff' as const, label: 'Actividad de staff' },
            { key: 'log'   as const, label: 'Registro detallado' },
          ]).map(t => (
            <button
              key={t.key}
              onClick={() => setVista(t.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                vista === t.key ? 'bg-surface text-fg shadow-sm' : 'text-fg-muted hover:text-fg'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {vista === 'staff' ? (
        <div className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
          <StaffTable />
        </div>
      ) : (
        <RegistroDetallado />
      )}
    </div>
  )
}
