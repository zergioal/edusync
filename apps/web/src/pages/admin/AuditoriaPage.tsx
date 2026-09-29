import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { Spinner, Badge } from '@edusync/ui'
import { ROL_LABELS } from '../../lib/roleRoutes'
import { Rol } from '@edusync/types'

// ─── Traducción de recurso técnico → actividad legible ──────────────────────

// El backend registra el primer segmento de la ruta llamada (p.ej. "notas",
// "estudiantes") — sin este mapa, el staff vería códigos internos sin sentido.
const RECURSO_LABEL: Record<string, string> = {
  notas:                  'una calificación',
  indicadores:            'un indicador',
  tareas:                 'una tarea',
  asistencia:             'un registro de asistencia',
  anuncios:               'un comunicado',
  mensajes:               'un mensaje',
  estudiantes:            'un estudiante',
  docentes:               'un docente',
  padres:                 'un padre/tutor',
  matriculas:             'una matrícula',
  pensiones:              'un pago de pensión',
  tarifas:                'una tarifa',
  boletines:              'un boletín',
  configuracion:          'la configuración',
  inicial:                'una observación de Inicial',
  paralelos:              'un paralelo',
  asignaciones:           'una asignación',
  gestiones:              'la gestión académica',
  trimestres:             'un trimestre',
  materias:               'una materia',
  planilla:               'la planilla de calificaciones',
  reportes:               'un reporte',
  notificaciones:         'una notificación',
  documentos:             'un documento',
  certificados:           'un certificado',
  'observaciones-diarias': 'una observación diaria',
  horarios:               'un horario',
  instituciones:          'la institución',
  usuarios:               'un usuario',
  personal:               'personal administrativo',
  'proyectos-bth':        'un proyecto BTH',
  niveles:                'un nivel',
  grados:                 'un grado',
}

function describirActividad(accion: string, recurso: string): string {
  if (recurso === 'auth')  return 'Inició sesión'
  if (recurso === 'setup') return 'Configuración inicial del sistema'
  const nombre = RECURSO_LABEL[recurso]
  const verbo  = accion === 'CREATE' ? 'Creó' : accion === 'DELETE' ? 'Eliminó' : 'Actualizó'
  return nombre ? `${verbo} ${nombre}` : `${verbo} un registro en "${recurso}"`
}

// Rol → primero staff, luego estudiante/padre — solo para el <select> de filtro.
const ROL_OPCIONES: Rol[] = [
  Rol.ADMIN_SISTEMA, Rol.DIRECTOR, Rol.COORDINADOR, Rol.SECRETARIA,
  Rol.REGENTE, Rol.CONTADOR, Rol.DOCENTE, Rol.ESTUDIANTE, Rol.PADRE_TUTOR,
]

// ─── Vista: actividad de usuarios ────────────────────────────────────────────

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
  const [rol,     setRol]     = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.get<StaffItem[]>(`/auditoria/staff${rol ? `?rol=${rol}` : ''}`)
      .then(setStaff)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [rol])

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
        <label className="text-xs font-medium text-fg-muted uppercase tracking-wide">Tipo de usuario</label>
        <select
          value={rol}
          onChange={e => setRol(e.target.value)}
          className="rounded-lg border border-border px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand"
        >
          <option value="">Personal (staff)</option>
          <option value="TODOS">Todos los usuarios</option>
          {ROL_OPCIONES.map(r => <option key={r} value={r}>{ROL_LABELS[r]}</option>)}
        </select>
        {!loading && <span className="text-xs text-fg-muted">{staff.length} usuario{staff.length === 1 ? '' : 's'}</span>}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : staff.length === 0 ? (
        <div className="py-12 text-center text-sm text-fg-muted">Sin usuarios registrados para este filtro</div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-bg text-xs font-semibold uppercase tracking-wide text-fg-muted">
              <th className="px-5 py-3 text-left">Nombre</th>
              <th className="px-5 py-3 text-left">Tipo de usuario</th>
              <th className="px-5 py-3 text-left">Última conexión</th>
              <th className="px-5 py-3 text-left">Última actividad</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {staff.map(s => (
              <tr key={s.id} className="hover:bg-surface-2 transition-colors">
                <td className="px-5 py-3 font-medium text-fg">
                  {s.apellido}, {s.nombre}
                  {!s.activo && <Badge variant="danger" className="ml-2">Inactivo</Badge>}
                </td>
                <td className="px-5 py-3 text-fg-muted">{ROL_LABELS[s.rol] ?? s.rol}</td>
                <td className="px-5 py-3 text-fg-muted">
                  {s.ultima_conexion ? relativo(s.ultima_conexion) : <span className="text-fg-muted italic">Nunca</span>}
                </td>
                <td className="px-5 py-3 text-fg-muted">
                  {s.ultima_accion
                    ? <>
                        <span>{describirActividad(s.ultima_accion.accion, s.ultima_accion.recurso)}</span>
                        <span className="ml-1.5 text-xs text-fg-muted">· {relativo(s.ultima_accion.creado_en)}</span>
                      </>
                    : <span className="text-fg-muted italic">Sin actividad registrada</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
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
  usuario:        { nombre: string; apellido: string; rol: keyof typeof ROL_LABELS } | null
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
  const [rol,      setRol]      = useState('')
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
      if (rol)     params.set('rol', rol)
      const data = await api.get<LogEntry[]>(`/auditoria?${params}`)
      setLogs(reset ? data : prev => [...prev, ...data])
      setHasMore(data.length === 50)
    } catch { /* silencioso */ }
    finally { setLoading(false) }
  }

  useEffect(() => { cargar(true) }, [recurso, accion, rol])

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
          <option value="CREATE">Creaciones</option>
          <option value="UPDATE">Actualizaciones</option>
          <option value="DELETE">Eliminaciones</option>
        </select>
        <select
          value={rol}
          onChange={e => setRol(e.target.value)}
          className="rounded-lg border border-border px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand"
        >
          <option value="">Todos los tipos de usuario</option>
          {ROL_OPCIONES.map(r => <option key={r} value={r}>{ROL_LABELS[r]}</option>)}
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
                <th className="px-5 py-3 text-left">Usuario</th>
                <th className="px-5 py-3 text-left">Actividad</th>
                <th className="px-5 py-3 text-left">Recurso</th>
                <th className="px-5 py-3 text-left">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs.map(l => (
                <tr key={l.id} className="hover:bg-surface-2 transition-colors">
                  <td className="px-5 py-3 text-fg-muted whitespace-nowrap">{fmt(l.creado_en)}</td>
                  <td className="px-5 py-3 text-fg">
                    {l.usuario
                      ? <>
                          <span className="font-medium">{l.usuario.apellido}, {l.usuario.nombre}</span>
                          <span className="block text-xs text-fg-muted">{ROL_LABELS[l.usuario.rol] ?? l.usuario.rol}</span>
                        </>
                      : <span className="text-fg-muted italic">Sistema / sesión anónima</span>}
                  </td>
                  <td className="px-5 py-3">
                    <Badge variant={ACCION_VARIANT[l.accion] ?? 'info'}>{describirActividad(l.accion, l.recurso)}</Badge>
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-fg-muted">
                    {l.recurso}
                    {l.recurso_id && <span className="block truncate max-w-[140px]">{l.recurso_id}</span>}
                  </td>
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
            {vista === 'staff' ? 'Última conexión y actividad por usuario' : 'Registro detallado de acciones'}
          </p>
        </div>
        <div className="flex gap-1 rounded-xl bg-surface-2 p-1 w-fit">
          {([
            { key: 'staff' as const, label: 'Actividad de usuarios' },
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
