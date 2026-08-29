import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { Rol } from '@edusync/types'
import { Button, Badge, Spinner } from '@edusync/ui'
import { SelectGestion } from '../../components/select/SelectGestion'
import { SelectTrimestre } from '../../components/select/SelectTrimestre'
import { useGestionActiva } from '../../hooks/useGestionActiva'
import { PlanillaMateriaDetalle } from '../../components/planilla/PlanillaMateriaDetalle'
import { useIsMobile } from '../../hooks/useIsMobile'
import type { DimensionPlanilla, EstudiantePlanilla } from '../../hooks/usePlanilla'

// ─── Types ────────────────────────────────────────────────────────────────────

type EstadoEstudiante = 'PREINSCRITO' | 'ACTIVO' | 'RETIRADO' | 'TRASLADADO' | 'EGRESADO'
type ResultadoMatricula = 'SIN_DEFINIR' | 'EN_CURSO' | 'PROMOVIDO' | 'NO_PROMOVIDO'

interface Matricula {
  id:            string
  lleva_tecnica: boolean
  resultado:     ResultadoMatricula
  gestion:       { id: string; anno: number; activa: boolean }
  paralelo:      { letra: string; grado: { nombre: string; nivel: { nombre: string } } }
}

interface Estudiante {
  id:      string
  codigo:  string
  nivel:   { nombre: string }
  usuario: { nombre: string; apellido: string; email: string; activo: boolean }
  estado:               EstadoEstudiante
  estado_motivo:        string | null
  estado_fecha:         string | null
  institucion_destino:  string | null
  matriculas:       Matricula[]
  relaciones_padre: { padre: { nombre: string; apellido: string; email: string; telefono: string | null } }[]
}

const CAN_MANAGE_TECNICA = [Rol.ADMIN_SISTEMA, Rol.DIRECTOR, Rol.COORDINADOR, Rol.SECRETARIA] as string[]

type Tab = 'datos' | 'calificaciones' | 'asistencia' | 'pensiones' | 'documentos' | 'certificados'

// ─── Shared: Selector Gestion + Trimestre ─────────────────────────────────────

function GestionTrimestreSelector({
  gestionId, trimestreId,
  onGestion, onTrimestre,
}: {
  gestionId: string; trimestreId: string
  onGestion: (v: string) => void; onTrimestre: (v: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-4 items-end rounded-xl border border-border bg-surface p-4 shadow-sm">
      <SelectGestion value={gestionId} onChange={v => { onGestion(v); onTrimestre('') }} label="Gestión" />
      <SelectTrimestre value={trimestreId} onChange={onTrimestre} gestionId={gestionId} label="Trimestre" />
    </div>
  )
}

// ─── Tab: Datos ───────────────────────────────────────────────────────────────

const ESTADO_LABEL: Record<EstadoEstudiante, string> = {
  PREINSCRITO: 'Preinscrito', ACTIVO: 'Activo', RETIRADO: 'Retirado', TRASLADADO: 'Trasladado', EGRESADO: 'Egresado',
}
const ESTADO_BADGE: Record<EstadoEstudiante, 'success' | 'danger' | 'warning' | 'default' | 'info'> = {
  PREINSCRITO: 'info', ACTIVO: 'success', RETIRADO: 'danger', TRASLADADO: 'warning', EGRESADO: 'default',
}
/** Transiciones permitidas desde cada estado — espejo de estudiantes.service.ts.
 *  EGRESADO no aparece como destino: solo lo asigna el cierre de gestión. */
const TRANSICIONES: Record<EstadoEstudiante, EstadoEstudiante[]> = {
  PREINSCRITO: ['ACTIVO'],
  ACTIVO:      ['RETIRADO', 'TRASLADADO'],
  RETIRADO:    [],
  TRASLADADO:  [],
  EGRESADO:    [],
}

const RESULTADO_LABEL: Record<ResultadoMatricula, string> = {
  SIN_DEFINIR: 'Sin definir', EN_CURSO: 'En curso', PROMOVIDO: 'Promovido', NO_PROMOVIDO: 'No promovido',
}
const RESULTADO_BADGE: Record<ResultadoMatricula, 'success' | 'danger' | 'warning' | 'default'> = {
  SIN_DEFINIR: 'default', EN_CURSO: 'warning', PROMOVIDO: 'success', NO_PROMOVIDO: 'danger',
}

function CambiarEstadoModal({
  estadoDestino, onClose, onConfirm, saving,
}: {
  estadoDestino: EstadoEstudiante
  onClose:       () => void
  onConfirm:     (motivo: string, institucionDestino: string) => void
  saving:        boolean
}) {
  const [motivo, setMotivo] = useState('')
  const [institucionDestino, setInstitucionDestino] = useState('')
  const requiereMotivo = estadoDestino === 'RETIRADO' || estadoDestino === 'TRASLADADO'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-xl space-y-4">
        <h2 className="text-lg font-bold text-fg">Cambiar estado a "{ESTADO_LABEL[estadoDestino]}"</h2>
        {requiereMotivo && (
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-fg-muted uppercase tracking-wide">Motivo *</span>
            <textarea required value={motivo} onChange={e => setMotivo(e.target.value)} rows={3}
              placeholder={estadoDestino === 'RETIRADO' ? 'Ej: Cambio de ciudad, decisión familiar…' : 'Ej: Traslado por mudanza'}
              className="rounded-xl border border-border px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200" />
          </label>
        )}
        {estadoDestino === 'TRASLADADO' && (
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-fg-muted uppercase tracking-wide">Institución de destino (opcional)</span>
            <input value={institucionDestino} onChange={e => setInstitucionDestino(e.target.value)}
              placeholder="Nombre de la unidad educativa"
              className="rounded-xl border border-border px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200" />
          </label>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button type="button" onClick={() => onConfirm(motivo, institucionDestino)}
            disabled={saving || (requiereMotivo && !motivo.trim())}>
            {saving ? '…' : 'Confirmar'}
          </Button>
        </div>
      </div>
    </div>
  )
}

interface HistorialEstadoRow {
  id: string; estado_anterior: EstadoEstudiante | null; estado_nuevo: EstadoEstudiante
  motivo: string | null; creado_en: string
  usuario: { nombre: string; apellido: string }
}

function HistorialEstado({ estudianteId }: { estudianteId: string }) {
  const [rows, setRows] = useState<HistorialEstadoRow[] | null>(null)

  useEffect(() => {
    api.get<HistorialEstadoRow[]>(`/estudiantes/${estudianteId}/historial-estado`)
      .then(setRows)
      .catch(() => setRows([]))
  }, [estudianteId])

  if (rows === null) return null
  if (rows.length === 0) return null

  return (
    <div className="rounded-xl border border-border bg-surface shadow-sm p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-fg-muted mb-4">Historial de estado</h2>
      <div className="space-y-3">
        {rows.map(r => (
          <div key={r.id} className="text-sm border-l-2 border-border pl-3">
            <p className="font-medium text-fg">
              {r.estado_anterior ? `${ESTADO_LABEL[r.estado_anterior]} → ` : ''}{ESTADO_LABEL[r.estado_nuevo]}
            </p>
            {r.motivo && <p className="text-fg-muted mt-0.5">{r.motivo}</p>}
            <p className="text-xs text-fg-muted mt-0.5">
              {new Date(r.creado_en).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' })}
              {' · '}{r.usuario.apellido}, {r.usuario.nombre}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

function DatosTab({
  est, canManageTecnica, onMatriculaUpdate, onEstadoUpdate,
}: {
  est: Estudiante
  canManageTecnica: boolean
  onMatriculaUpdate: (matriculaId: string, lleva_tecnica: boolean) => void
  onEstadoUpdate:    (estado: EstadoEstudiante, estado_motivo: string | null, institucion_destino: string | null) => void
}) {
  const matriculaActiva = est.matriculas.find(m => m.gestion.activa) ?? est.matriculas[0]
  const [toggleLoading, setToggleLoading] = useState(false)
  const [estadoLoading, setEstadoLoading] = useState(false)
  const [estadoModal,   setEstadoModal]   = useState<EstadoEstudiante | null>(null)

  const handleToggleTecnica = useCallback(async () => {
    if (!matriculaActiva) return
    const newVal = !matriculaActiva.lleva_tecnica
    setToggleLoading(true)
    try {
      await api.patch(`/matriculas/${est.id}/${matriculaActiva.gestion.id}/tecnica`, { lleva_tecnica: newVal })
      onMatriculaUpdate(matriculaActiva.id, newVal)
    } catch { /* ignore */ }
    finally { setToggleLoading(false) }
  }, [matriculaActiva, est.id, onMatriculaUpdate])

  const confirmarCambioEstado = useCallback(async (motivo: string, institucionDestino: string) => {
    if (!estadoModal) return
    setEstadoLoading(true)
    try {
      await api.patch(`/estudiantes/${est.id}`, {
        estado: estadoModal,
        ...(motivo.trim() ? { estado_motivo: motivo.trim() } : {}),
        ...(institucionDestino.trim() ? { institucion_destino: institucionDestino.trim() } : {}),
      })
      onEstadoUpdate(estadoModal, motivo.trim() || null, institucionDestino.trim() || null)
      setEstadoModal(null)
    } catch { /* ignore */ }
    finally { setEstadoLoading(false) }
  }, [estadoModal, est.id, onEstadoUpdate])

  const opcionesEstado = TRANSICIONES[est.estado] ?? []

  // Show lleva_tecnica toggle for students in 5° or 6° Secundaria
  const esTTE = matriculaActiva
    ? (matriculaActiva.paralelo.grado.nombre.includes('5°') || matriculaActiva.paralelo.grado.nombre.includes('6°'))
      && matriculaActiva.paralelo.grado.nivel.nombre === 'SECUNDARIA'
    : false

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-surface shadow-sm p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xl font-bold text-fg">{est.usuario.apellido}, {est.usuario.nombre}</p>
            <p className="text-sm text-fg-muted mt-1">{est.usuario.email}</p>
          </div>
          <div className="text-right space-y-1">
            <span className="font-mono text-sm bg-surface-2 px-3 py-1 rounded text-fg block">{est.codigo}</span>
            {est.usuario.activo
              ? <Badge variant="success">Activo</Badge>
              : <Badge variant="danger">Inactivo</Badge>}
          </div>
        </div>
        {matriculaActiva && (
          <div className="border-t border-border pt-4 grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-fg-muted">Nivel:</span>{' '}
              <span className="font-medium">{matriculaActiva.paralelo.grado.nivel.nombre}</span>
            </div>
            <div><span className="text-fg-muted">Grado y Paralelo:</span>{' '}
              <span className="font-medium">{matriculaActiva.paralelo.grado.nombre} "{matriculaActiva.paralelo.letra}"</span>
            </div>
            <div><span className="text-fg-muted">Gestión:</span>{' '}
              <span className="font-medium">{matriculaActiva.gestion.anno}</span>
            </div>
            <div className="col-span-2 flex items-center gap-2 flex-wrap">
              <span className="text-fg-muted">Estado del estudiante:</span>
              {canManageTecnica && opcionesEstado.length > 0 ? (
                <select
                  value=""
                  onChange={e => { if (e.target.value) setEstadoModal(e.target.value as EstadoEstudiante) }}
                  disabled={estadoLoading}
                  className="rounded-lg border border-border px-2 py-1 text-sm font-medium focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand disabled:opacity-50"
                >
                  <option value="">{ESTADO_LABEL[est.estado]} — cambiar a…</option>
                  {opcionesEstado.map(e => (
                    <option key={e} value={e}>{ESTADO_LABEL[e]}</option>
                  ))}
                </select>
              ) : (
                <Badge variant={ESTADO_BADGE[est.estado]}>{ESTADO_LABEL[est.estado]}</Badge>
              )}
              {est.estado !== 'ACTIVO' && est.estado_motivo && (
                <span className="text-xs text-fg-muted">
                  — {est.estado_motivo}
                  {est.institucion_destino ? ` (destino: ${est.institucion_destino})` : ''}
                  {est.estado_fecha ? ` · ${new Date(est.estado_fecha).toLocaleDateString('es-BO')}` : ''}
                </span>
              )}
            </div>
            {esTTE && (
              <div className="col-span-2 flex items-center justify-between rounded-lg bg-indigo-50 border border-indigo-100 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-indigo-900">Modalidad Técnica (TTE)</p>
                  <p className="text-xs text-indigo-600 mt-0.5">
                    {matriculaActiva.lleva_tecnica ? 'Inscrito en Técnica Tecnológica Especializada' : 'No lleva materias técnicas'}
                  </p>
                </div>
                {canManageTecnica && (
                  <button
                    type="button"
                    onClick={handleToggleTecnica}
                    disabled={toggleLoading}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                      matriculaActiva.lleva_tecnica ? 'bg-indigo-600' : 'bg-surface-2'
                    } ${toggleLoading ? 'opacity-50' : ''}`}
                    aria-label="Toggle modalidad técnica"
                  >
                    <span className={`inline-block h-5 w-5 transform rounded-full bg-surface shadow transition-transform duration-200 ${
                      matriculaActiva.lleva_tecnica ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-surface shadow-sm p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-fg-muted mb-4">Tutores / Padres</h2>
        {est.relaciones_padre.length === 0
          ? <p className="text-sm text-fg-muted italic">Sin tutores registrados</p>
          : <div className="space-y-3">
              {est.relaciones_padre.map((rel, i) => (
                <div key={i} className="flex items-center gap-4 text-sm">
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs flex-shrink-0">
                    {rel.padre.nombre[0]}
                  </div>
                  <div>
                    <p className="font-medium text-fg">{rel.padre.apellido}, {rel.padre.nombre}</p>
                    <p className="text-fg-muted">{rel.padre.email}{rel.padre.telefono ? ` · ${rel.padre.telefono}` : ''}</p>
                  </div>
                </div>
              ))}
            </div>
        }
      </div>

      <div className="rounded-xl border border-border bg-surface shadow-sm p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-fg-muted mb-4">Historial de matrículas</h2>
        {est.matriculas.length === 0
          ? <p className="text-sm text-fg-muted italic">Sin matrículas</p>
          : <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-fg-muted border-b border-border">
                  <th className="pb-2">Gestión</th><th className="pb-2">Grado</th>
                  <th className="pb-2">Paralelo</th><th className="pb-2">Período</th><th className="pb-2">Resultado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {est.matriculas.map(m => (
                  <tr key={m.id}>
                    <td className="py-2 font-medium">{m.gestion.anno}</td>
                    <td className="py-2 text-fg-muted">{m.paralelo.grado.nombre}</td>
                    <td className="py-2">{m.paralelo.letra}</td>
                    <td className="py-2">{m.gestion.activa
                      ? <Badge variant="success">Activa</Badge>
                      : <Badge variant="default">Finalizada</Badge>}
                    </td>
                    <td className="py-2"><Badge variant={RESULTADO_BADGE[m.resultado]}>{RESULTADO_LABEL[m.resultado]}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
        }
      </div>

      <HistorialEstado estudianteId={est.id} />

      {estadoModal && (
        <CambiarEstadoModal
          estadoDestino={estadoModal}
          saving={estadoLoading}
          onClose={() => setEstadoModal(null)}
          onConfirm={confirmarCambioEstado}
        />
      )}
    </div>
  )
}

// ─── Tab: Calificaciones ──────────────────────────────────────────────────────

interface MateriaBoletin {
  nombre: string; campo: string
  ser: number; saber: number; hacer: number; autoevaluacion: number
  total: number; escala: string
}
interface Boletin {
  tipo: 'REGULAR' | 'INICIAL'
  dimensiones?: { nombre: string; puntaje_max: number }[]
  materias?: MateriaBoletin[]
  materias_inicial?: { nombre: string; docente: string; observacion: string | null }[]
  promedio_general?: number
  escala_general?: string
}

function escalaColor(e: string) {
  if (e === 'ED') return 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400'
  if (e === 'DA') return 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'
  if (e === 'DO') return 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400'
  return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
}

interface MateriaPlanillaStaff {
  asignacion_id: string
  materia:       { nombre: string; campo: string }
  observacion:   string | null
  dimensiones:   DimensionPlanilla[]
  estudiante:    EstudiantePlanilla | null
}
interface PlanillaStaffResponse {
  tipo:     'REGULAR' | 'INICIAL'
  materias?: MateriaPlanillaStaff[]
}

function CalificacionesTab({ estudianteId }: { estudianteId: string }) {
  const { id: gestionActivaId, trimestreActual } = useGestionActiva()
  const isMobile = useIsMobile()
  const [gestionId,    setGestionId]    = useState('')
  const [trimestreId,  setTrimestreId]  = useState('')
  const [boletin,      setBoletin]      = useState<Boletin | null>(null)
  const [planilla,     setPlanilla]     = useState<MateriaPlanillaStaff[]>([])
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState('')
  const [detalleAbierto, setDetalleAbierto] = useState<MateriaPlanillaStaff | null>(null)

  // Por defecto: gestión activa + primer trimestre no cerrado (se puede cambiar con el selector)
  useEffect(() => {
    if (gestionActivaId && !gestionId) setGestionId(gestionActivaId)
  }, [gestionActivaId, gestionId])
  useEffect(() => {
    if (trimestreActual && !trimestreId) setTrimestreId(trimestreActual.id)
  }, [trimestreActual, trimestreId])

  useEffect(() => {
    if (!trimestreId) { setBoletin(null); setPlanilla([]); return }
    setLoading(true); setError('')
    Promise.all([
      api.get<Boletin>(`/boletines/${estudianteId}?trimestre_id=${trimestreId}`),
      api.get<PlanillaStaffResponse>(`/planilla/estudiante/${estudianteId}?trimestre_id=${trimestreId}`).catch(() => null),
    ])
      .then(([b, p]) => {
        setBoletin(b)
        setPlanilla(p?.tipo === 'REGULAR' ? (p.materias ?? []) : [])
      })
      .catch(e => setError(e?.message ?? 'Error al cargar calificaciones'))
      .finally(() => setLoading(false))
  }, [estudianteId, trimestreId])

  return (
    <div className="space-y-4">
      <GestionTrimestreSelector
        gestionId={gestionId} trimestreId={trimestreId}
        onGestion={setGestionId} onTrimestre={setTrimestreId}
      />

      {!trimestreId && (
        <div className="rounded-xl border border-border bg-surface p-10 text-center text-sm text-fg-muted shadow-sm">
          Selecciona una gestión y un trimestre para ver las calificaciones.
        </div>
      )}

      {loading && <div className="flex justify-center py-12"><Spinner /></div>}
      {error   && <div className="rounded-xl bg-red-50 dark:bg-red-950/40 p-4 text-sm text-red-700 dark:text-red-400">{error}</div>}

      {boletin && !loading && boletin.tipo === 'REGULAR' && boletin.materias && (
        isMobile ? (
          /* ── Tarjetas por materia (móvil) — sin scroll horizontal ── */
          <div className="space-y-2.5">
            {boletin.promedio_general !== undefined && (
              <div className="rounded-xl bg-slate-800 dark:bg-slate-900 text-white p-3 flex items-center justify-between">
                <span className="text-sm font-semibold">Promedio general</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${escalaColor(boletin.escala_general ?? '')}`}>
                  {boletin.promedio_general.toFixed(1)} — {boletin.escala_general}
                </span>
              </div>
            )}
            {boletin.materias.map((m, i) => {
              const detalle = planilla.find(p => p.materia.nombre === m.nombre)
              return (
                <div key={i} className="rounded-xl border border-border bg-surface p-3 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-fg text-sm truncate">{m.nombre}</div>
                      <div className="text-xs text-fg-muted">{m.campo}</div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-lg font-bold text-fg">{m.total}</span>
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${escalaColor(m.escala)}`}>{m.escala}</span>
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-4 gap-1.5">
                    {[['Ser', m.ser], ['Saber', m.saber], ['Hacer', m.hacer], ['Auto', m.autoevaluacion]].map(([label, val]) => (
                      <div key={label} className="rounded-lg bg-surface-2 px-1.5 py-1 text-center">
                        <div className="text-[10px] text-fg-muted">{label}</div>
                        <div className="text-sm font-bold text-fg">{val}</div>
                      </div>
                    ))}
                  </div>
                  {detalle && (
                    <button
                      onClick={() => setDetalleAbierto(detalle)}
                      className="mt-2 w-full rounded-lg border border-border py-1.5 text-xs font-medium text-brand hover:bg-surface-2"
                    >
                      Ver registro del profesor
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-border flex items-center justify-between">
              <span className="text-sm font-semibold text-fg">Calificaciones por materia</span>
              {boletin.promedio_general !== undefined && (
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${escalaColor(boletin.escala_general ?? '')}`}>
                  Promedio general: {boletin.promedio_general.toFixed(1)} — {boletin.escala_general}
                </span>
              )}
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-2 text-left text-xs font-semibold uppercase tracking-wide text-fg-muted border-b border-border">
                  <th className="px-5 py-3">Campo</th>
                  <th className="px-5 py-3">Materia</th>
                  {boletin.dimensiones?.map(d => (
                    <th key={d.nombre} className="px-3 py-3 text-center">{d.nombre}<br/><span className="font-normal normal-case">/{d.puntaje_max}</span></th>
                  ))}
                  <th className="px-3 py-3 text-center">Total</th>
                  <th className="px-3 py-3 text-center">Escala</th>
                  <th className="px-3 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {boletin.materias.map((m, i) => {
                  const detalle = planilla.find(p => p.materia.nombre === m.nombre)
                  return (
                    <tr key={i} className="hover:bg-surface-2/60">
                      <td className="px-5 py-2.5 text-fg-muted text-xs">{m.campo}</td>
                      <td className="px-5 py-2.5 font-medium text-fg">{m.nombre}</td>
                      <td className="px-3 py-2.5 text-center text-fg">{m.ser}</td>
                      <td className="px-3 py-2.5 text-center text-fg">{m.saber}</td>
                      <td className="px-3 py-2.5 text-center text-fg">{m.hacer}</td>
                      <td className="px-3 py-2.5 text-center text-fg">{m.autoevaluacion}</td>
                      <td className="px-3 py-2.5 text-center font-semibold text-fg">{m.total}</td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${escalaColor(m.escala)}`}>{m.escala}</span>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {detalle && (
                          <button
                            onClick={() => setDetalleAbierto(detalle)}
                            className="text-xs font-medium text-brand hover:text-brand-hover"
                          >
                            Ver registro del profesor
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {boletin && !loading && boletin.tipo === 'INICIAL' && boletin.materias_inicial && (
        <div className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-2 text-left text-xs font-semibold uppercase tracking-wide text-fg-muted border-b border-border">
                <th className="px-5 py-3">Área</th>
                <th className="px-5 py-3">Docente</th>
                <th className="px-5 py-3">Observación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {boletin.materias_inicial.map((m, i) => (
                <tr key={i} className="hover:bg-surface-2/60">
                  <td className="px-5 py-2.5 font-medium text-fg">{m.nombre}</td>
                  <td className="px-5 py-2.5 text-fg-muted">{m.docente}</td>
                  <td className="px-5 py-2.5 text-fg-muted">{m.observacion ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {detalleAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-surface p-6 shadow-xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-fg">{detalleAbierto.materia.nombre}</h2>
                <p className="text-sm text-fg-muted">{detalleAbierto.materia.campo}</p>
              </div>
              <button
                onClick={() => setDetalleAbierto(null)}
                className="text-fg-muted hover:text-fg text-2xl leading-none"
              >×</button>
            </div>
            {detalleAbierto.observacion && (
              <div className="rounded-lg bg-blue-50 dark:bg-blue-950/40 border-l-4 border-blue-400 dark:border-blue-600 px-3 py-2 text-sm text-blue-800 dark:text-blue-300">
                <span className="font-medium">Observación del docente: </span>{detalleAbierto.observacion}
              </div>
            )}
            <PlanillaMateriaDetalle
              dimensiones={detalleAbierto.dimensiones}
              estudiante={detalleAbierto.estudiante}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Tab: Asistencia ──────────────────────────────────────────────────────────

interface AsistenciaConsolidada {
  diaria: {
    total_asistencias: number
    total_faltas:      number
    total_tardanzas:   number
    dias: Array<{ fecha: string; estado: string }>
  }
  por_materia: Array<{ materia: string; presentes: number; ausentes: number; tardanzas: number }>
}

function AsistenciaTab({ estudianteId }: { estudianteId: string }) {
  const [gestionId,   setGestionId]   = useState('')
  const [trimestreId, setTrimestreId] = useState('')
  const [data,        setData]        = useState<AsistenciaConsolidada | null>(null)
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState('')

  useEffect(() => {
    if (!trimestreId) { setData(null); return }
    setLoading(true); setError('')
    api.get<AsistenciaConsolidada>(`/asistencia/consolidada/${estudianteId}?trimestre_id=${trimestreId}`)
      .then(setData)
      .catch(e => setError(e?.message ?? 'Error al cargar asistencia'))
      .finally(() => setLoading(false))
  }, [estudianteId, trimestreId])

  const pct = (presentes: number, total: number) =>
    total > 0 ? `${Math.round((presentes / total) * 100)}%` : '—'

  return (
    <div className="space-y-4">
      <GestionTrimestreSelector
        gestionId={gestionId} trimestreId={trimestreId}
        onGestion={setGestionId} onTrimestre={setTrimestreId}
      />

      {!trimestreId && (
        <div className="rounded-xl border border-border bg-surface p-10 text-center text-sm text-fg-muted shadow-sm">
          Selecciona una gestión y un trimestre para ver la asistencia.
        </div>
      )}

      {loading && <div className="flex justify-center py-12"><Spinner /></div>}
      {error   && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {data && !loading && (
        <div className="space-y-4">
          {/* Asistencia diaria */}
          <div className="rounded-xl border border-border bg-surface shadow-sm p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-fg-muted mb-4">Asistencia diaria (regente)</h3>
            {(() => {
              const total = data.diaria.total_asistencias + data.diaria.total_faltas + data.diaria.total_tardanzas
              return (
                <div className="grid grid-cols-4 gap-4 text-center">
                  {[
                    { label: 'Presentes',  val: data.diaria.total_asistencias, color: 'text-green-600' },
                    { label: 'Ausentes',   val: data.diaria.total_faltas,       color: 'text-red-600'   },
                    { label: 'Tardanzas',  val: data.diaria.total_tardanzas,    color: 'text-amber-600' },
                    { label: 'Asistencia', val: pct(data.diaria.total_asistencias, total), color: 'text-blue-600' },
                  ].map(item => (
                    <div key={item.label} className="rounded-lg bg-bg p-3">
                      <p className={`text-2xl font-bold ${item.color}`}>{item.val}</p>
                      <p className="text-xs text-fg-muted mt-1">{item.label}</p>
                    </div>
                  ))}
                </div>
              )
            })()}
          </div>

          {/* Asistencia por clase */}
          {data.por_materia.length > 0 && (
            <div className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-border">
                <span className="text-sm font-semibold text-fg">Asistencia por materia (clases)</span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-bg text-left text-xs font-semibold uppercase tracking-wide text-fg-muted border-b border-border">
                    <th className="px-5 py-3">Materia</th>
                    <th className="px-3 py-3 text-center">Presentes</th>
                    <th className="px-3 py-3 text-center">Ausentes</th>
                    <th className="px-3 py-3 text-center">Tardanzas</th>
                    <th className="px-3 py-3 text-center">%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.por_materia.map((c, i) => {
                    const tot = c.presentes + c.ausentes + c.tardanzas
                    const p   = pct(c.presentes, tot)
                    return (
                      <tr key={i} className="hover:bg-surface-2">
                        <td className="px-5 py-2.5 font-medium">{c.materia}</td>
                        <td className="px-3 py-2.5 text-center text-green-600">{c.presentes}</td>
                        <td className="px-3 py-2.5 text-center text-red-600">{c.ausentes}</td>
                        <td className="px-3 py-2.5 text-center text-amber-600">{c.tardanzas}</td>
                        <td className="px-3 py-2.5 text-center font-semibold">
                          <span className={tot > 0 && c.presentes / tot < 0.7 ? 'text-red-600' : 'text-fg'}>{p}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {data.por_materia.length === 0 && (
            <p className="text-sm text-fg-muted italic px-1">Sin registros de asistencia por clase en este trimestre.</p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Tab: Pensiones ───────────────────────────────────────────────────────────

const MES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

interface EstadoCuenta {
  becado?: boolean
  mensaje?: string
  meses: Array<{ id: string; mes: number; nombre_mes: string; monto: number; pagado: boolean; fecha_pago: string | null; dias_mora: number }>
  resumen: { total_pagado: number; total_pendiente: number; meses_pagados: number; meses_pendientes: number; al_dia: boolean }
  gestion?: { anno: number }
}

function PensionesTab({ estudianteId }: { estudianteId: string }) {
  const [data,    setData]    = useState<EstadoCuenta | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  useEffect(() => {
    setLoading(true); setError('')
    api.get<EstadoCuenta>(`/pensiones/estado-cuenta/${estudianteId}`)
      .then(setData)
      .catch(e => setError(e?.message ?? 'Error al cargar pensiones'))
      .finally(() => setLoading(false))
  }, [estudianteId])

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>
  if (error)   return <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>
  if (!data)   return null

  if (data.becado) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
        <p className="text-sm font-semibold text-amber-700">Estudiante becado</p>
        <p className="text-sm text-amber-600 mt-1">{data.mensaje}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Resumen */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Meses pagados',   val: data.resumen.meses_pagados,   color: 'text-green-600' },
          { label: 'Meses pendientes', val: data.resumen.meses_pendientes, color: data.resumen.meses_pendientes > 0 ? 'text-red-600' : 'text-fg-muted' },
          { label: 'Total pagado',    val: `Bs ${data.resumen.total_pagado.toFixed(2)}`,    color: 'text-green-600' },
          { label: 'Total pendiente', val: `Bs ${data.resumen.total_pendiente.toFixed(2)}`, color: data.resumen.total_pendiente > 0 ? 'text-red-600' : 'text-fg-muted' },
        ].map(item => (
          <div key={item.label} className="rounded-xl border border-border bg-surface shadow-sm p-4 text-center">
            <p className={`text-xl font-bold ${item.color}`}>{item.val}</p>
            <p className="text-xs text-fg-muted mt-1">{item.label}</p>
          </div>
        ))}
      </div>

      {/* Detalle */}
      <div className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <span className="text-sm font-semibold text-fg">
            Pensiones {data.gestion ? `Gestión ${data.gestion.anno}` : ''}
          </span>
          <Badge variant={data.resumen.al_dia ? 'success' : 'danger'}>
            {data.resumen.al_dia ? 'Al día' : 'Con deuda'}
          </Badge>
        </div>
        {data.meses.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-fg-muted">Sin pensiones generadas para esta gestión.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-bg text-left text-xs font-semibold uppercase tracking-wide text-fg-muted border-b border-border">
                <th className="px-5 py-3">Mes</th>
                <th className="px-5 py-3 text-right">Monto</th>
                <th className="px-5 py-3 text-center">Estado</th>
                <th className="px-5 py-3">Fecha pago</th>
                <th className="px-5 py-3 text-center">Mora (días)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.meses.map(p => (
                <tr key={p.id} className="hover:bg-surface-2">
                  <td className="px-5 py-2.5 font-medium">{p.nombre_mes || MES[(p.mes - 1)] || `Mes ${p.mes}`}</td>
                  <td className="px-5 py-2.5 text-right font-mono">Bs {p.monto.toFixed(2)}</td>
                  <td className="px-5 py-2.5 text-center">
                    <Badge variant={p.pagado ? 'success' : 'danger'}>{p.pagado ? 'Pagado' : 'Pendiente'}</Badge>
                  </td>
                  <td className="px-5 py-2.5 text-fg-muted">
                    {p.fecha_pago ? new Date(p.fecha_pago).toLocaleDateString('es-BO') : '—'}
                  </td>
                  <td className="px-5 py-2.5 text-center">
                    {!p.pagado && p.dias_mora > 0
                      ? <span className="text-red-600 font-semibold">{p.dias_mora}</span>
                      : <span className="text-fg-muted">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ─── Tab: Documentos ──────────────────────────────────────────────────────────

interface DocumentoRow {
  id: string; tipo: string; entregado: boolean
  fecha_entrega: string | null; observacion: string | null
}

function DocumentosTab({ estudianteId }: { estudianteId: string }) {
  const [checklist, setChecklist] = useState<DocumentoRow[]>([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState('')
  const [saving,    setSaving]    = useState<string | null>(null)

  useEffect(() => {
    setLoading(true); setError('')
    api.get<DocumentoRow[]>(`/documentos/${estudianteId}`)
      .then(setChecklist)
      .catch(() => setError('No se pudo cargar el checklist de documentos'))
      .finally(() => setLoading(false))
  }, [estudianteId])

  const toggle = useCallback(async (row: DocumentoRow) => {
    setSaving(row.tipo)
    try {
      const updated = await api.patch<DocumentoRow>(`/documentos/${estudianteId}`, {
        tipo: row.tipo, entregado: !row.entregado,
      })
      setChecklist(prev => prev.map(d => d.tipo === row.tipo ? updated : d))
    } catch { /* ignore */ }
    finally { setSaving(null) }
  }, [estudianteId])

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>
  if (error)   return <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>

  const entregados = checklist.filter(d => d.entregado).length

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <span className="text-sm font-semibold text-fg">Documentación del expediente</span>
          <Badge variant={entregados === checklist.length ? 'success' : 'warning'}>
            {entregados} / {checklist.length} entregados
          </Badge>
        </div>
        <div className="divide-y divide-border">
          {checklist.map(row => (
            <label key={row.tipo} className="flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-surface-2">
              <input
                type="checkbox"
                checked={row.entregado}
                disabled={saving === row.tipo}
                onChange={() => toggle(row)}
                className="h-4 w-4 rounded border-border text-indigo-600 focus:ring-indigo-500"
              />
              <div className="flex-1">
                <p className={`text-sm font-medium ${row.entregado ? 'text-fg' : 'text-fg-muted'}`}>{row.tipo}</p>
                {row.entregado && row.fecha_entrega && (
                  <p className="text-xs text-fg-muted">
                    Entregado el {new Date(row.fecha_entrega).toLocaleDateString('es-BO')}
                  </p>
                )}
              </div>
              {row.entregado
                ? <Badge variant="success">Entregado</Badge>
                : <Badge variant="danger">Pendiente</Badge>}
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Tab: Certificados ──────────────────────────────────────────────────────

interface CertificadoRow {
  id: string; tipo: string; fecha_emision: string; observacion: string | null
  emitido_por: { nombre: string; apellido: string }
}

function EmitirCertificadoModal({
  estudianteId, tipos, onClose, onCreated,
}: {
  estudianteId: string
  tipos:        readonly string[]
  onClose:      () => void
  onCreated:    (c: CertificadoRow) => void
}) {
  const [tipo,        setTipo]        = useState(tipos[0] ?? '')
  const [tipoOtro,     setTipoOtro]    = useState('')
  const [observacion, setObservacion] = useState('')
  const [saving,       setSaving]      = useState(false)
  const [error,        setError]       = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true); setError('')
    try {
      const c = await api.post<CertificadoRow>('/certificados', {
        estudiante_id: estudianteId,
        tipo,
        ...(tipo === 'Otro' ? { tipo_otro: tipoOtro } : {}),
        ...(observacion ? { observacion } : {}),
      })
      onCreated(c)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al emitir el certificado')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-xl space-y-4">
        <h2 className="text-lg font-bold text-fg">Emitir certificado / trámite</h2>
        {error && <div className="rounded-xl bg-red-50 border border-red-100 p-3 text-sm text-red-700">{error}</div>}
        <form onSubmit={submit} className="space-y-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-fg-muted uppercase tracking-wide">Tipo</span>
            <select value={tipo} onChange={e => setTipo(e.target.value)}
              className="rounded-xl border border-border px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200">
              {tipos.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          {tipo === 'Otro' && (
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-fg-muted uppercase tracking-wide">Especificar</span>
              <input required value={tipoOtro} onChange={e => setTipoOtro(e.target.value)}
                placeholder="Ej: Certificado de buena conducta"
                className="rounded-xl border border-border px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200" />
            </label>
          )}
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-fg-muted uppercase tracking-wide">Observación (opcional)</span>
            <textarea value={observacion} onChange={e => setObservacion(e.target.value)} rows={2}
              className="rounded-xl border border-border px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200" />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? '…' : 'Emitir certificado'}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

function CertificadosTab({ estudianteId }: { estudianteId: string }) {
  const [certificados, setCertificados] = useState<CertificadoRow[]>([])
  const [tipos,   setTipos]   = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    setLoading(true); setError('')
    Promise.all([
      api.get<CertificadoRow[]>(`/certificados/estudiante/${estudianteId}`),
      api.get<string[]>('/certificados/tipos'),
    ])
      .then(([c, t]) => { setCertificados(c); setTipos(t) })
      .catch(() => setError('No se pudo cargar el historial de certificados'))
      .finally(() => setLoading(false))
  }, [estudianteId])

  const remove = async (c: CertificadoRow) => {
    if (!confirm(`¿Eliminar el registro de "${c.tipo}"?`)) return
    try {
      await api.delete(`/certificados/${c.id}`)
      setCertificados(prev => prev.filter(x => x.id !== c.id))
    } catch { /* ignore */ }
  }

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>
  if (error)   return <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setModalOpen(true)}>+ Emitir certificado</Button>
      </div>
      <div className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
        {certificados.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-fg-muted">Sin certificados emitidos.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-bg text-left text-xs font-semibold uppercase tracking-wide text-fg-muted border-b border-border">
                <th className="px-5 py-3">Tipo</th>
                <th className="px-5 py-3">Fecha</th>
                <th className="px-5 py-3">Emitido por</th>
                <th className="px-5 py-3">Observación</th>
                <th className="px-5 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {certificados.map(c => (
                <tr key={c.id} className="hover:bg-surface-2">
                  <td className="px-5 py-2.5 font-medium">{c.tipo}</td>
                  <td className="px-5 py-2.5 text-fg-muted">{new Date(c.fecha_emision).toLocaleDateString('es-BO')}</td>
                  <td className="px-5 py-2.5 text-fg-muted">{c.emitido_por.apellido}, {c.emitido_por.nombre}</td>
                  <td className="px-5 py-2.5 text-fg-muted">{c.observacion ?? '—'}</td>
                  <td className="px-5 py-2.5 text-right">
                    <button onClick={() => remove(c)} className="text-xs font-medium text-red-500 hover:text-red-700">
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalOpen && (
        <EmitirCertificadoModal
          estudianteId={estudianteId}
          tipos={tipos}
          onClose={() => setModalOpen(false)}
          onCreated={c => setCertificados(prev => [c, ...prev])}
        />
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const ALL_TABS: { key: Tab; label: string }[] = [
  { key: 'datos',          label: 'Datos' },
  { key: 'calificaciones', label: 'Calificaciones' },
  { key: 'asistencia',     label: 'Asistencia' },
  { key: 'pensiones',      label: 'Pensiones' },
  { key: 'documentos',     label: 'Documentos' },
  { key: 'certificados',   label: 'Certificados' },
]

export default function PerfilEstudiantePage({
  visibleTabs,
}: { visibleTabs?: Tab[] } = {}) {
  const { id }    = useParams<{ id: string }>()
  const navigate  = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const { user } = useAuth()
  const canManageTecnica = user?.rol ? CAN_MANAGE_TECNICA.includes(user.rol) : false

  // Documentos/Certificados solo para roles con acceso al módulo (mismo guard que el backend)
  const baseTabs = canManageTecnica ? ALL_TABS : ALL_TABS.filter(t => t.key !== 'documentos' && t.key !== 'certificados')
  const TABS = visibleTabs ? baseTabs.filter(t => visibleTabs.includes(t.key)) : baseTabs

  const rawTab   = (searchParams.get('tab') ?? TABS[0]?.key ?? 'datos') as Tab
  const tab      = TABS.some(t => t.key === rawTab) ? rawTab : (TABS[0]?.key ?? 'datos') as Tab
  const setTab   = (t: Tab) => setSearchParams({ tab: t }, { replace: true })

  const [est,     setEst]     = useState<Estudiante | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  useEffect(() => {
    if (!id) return
    api.get<Estudiante>(`/estudiantes/${id}`)
      .then(setEst)
      .catch(() => setError('No se pudo cargar el perfil del estudiante'))
      .finally(() => setLoading(false))
  }, [id])

  const handleMatriculaUpdate = useCallback((matriculaId: string, lleva_tecnica: boolean) => {
    setEst(prev => {
      if (!prev) return prev
      return {
        ...prev,
        matriculas: prev.matriculas.map(m =>
          m.id === matriculaId ? { ...m, lleva_tecnica } : m
        ),
      }
    })
  }, [])

  const handleEstadoUpdate = useCallback((
    estado: EstadoEstudiante, estado_motivo: string | null, institucion_destino: string | null,
  ) => {
    setEst(prev => prev ? { ...prev, estado, estado_motivo, institucion_destino, estado_fecha: new Date().toISOString() } : prev)
  }, [])

  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>
  if (error || !est) return <div className="text-center py-16 text-red-500">{error || 'Estudiante no encontrado'}</div>

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>← Volver</Button>
        <div>
          <h1 className="text-2xl font-bold text-fg">
            {est.usuario.apellido}, {est.usuario.nombre}
          </h1>
          <p className="text-sm text-fg-muted mt-0.5 font-mono">{est.codigo}</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 rounded-xl bg-surface-2 p-1 w-fit">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as Tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.key
                ? 'bg-surface text-fg shadow-sm'
                : 'text-fg-muted hover:text-fg'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'datos'          && <DatosTab         est={est} canManageTecnica={canManageTecnica} onMatriculaUpdate={handleMatriculaUpdate} onEstadoUpdate={handleEstadoUpdate} />}
      {tab === 'calificaciones' && <CalificacionesTab estudianteId={est.id} />}
      {tab === 'asistencia'     && <AsistenciaTab     estudianteId={est.id} />}
      {tab === 'pensiones'      && <PensionesTab       estudianteId={est.id} />}
      {tab === 'documentos'     && <DocumentosTab      estudianteId={est.id} />}
      {tab === 'certificados'   && <CertificadosTab    estudianteId={est.id} />}
    </div>
  )
}
