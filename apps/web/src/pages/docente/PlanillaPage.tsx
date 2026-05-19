import { useState, useRef, useEffect, Fragment } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { usePlanilla, type PlanillaData, type DimensionPlanilla, type CreateIndicadorData, type TrimestrePlanilla } from '../../hooks/usePlanilla'
import { useToast } from '../../components/ui/Toast'
import { ApiError } from '../../lib/api'
import { Button, Spinner, Badge } from '@edusync/ui'
import { Instrumento } from '@edusync/types'
import { getTrimestreActivo, trimestreLabel } from '../../lib/trimestre'
import { useIsMobile } from '../../hooks/useIsMobile'

// ─── Constantes de estilo por dimensión (índice 0-3 = SER, SABER, HACER, AUTO) ─

const DIM_HEADER_BG   = ['bg-blue-600',  'bg-emerald-600', 'bg-amber-600',  'bg-purple-600' ]
const DIM_HEADER_TEXT = ['text-white',   'text-white',     'text-white',    'text-white'    ]
const DIM_CELL_BG     = ['bg-blue-50',   'bg-emerald-50',  'bg-amber-50',   'bg-purple-50'  ]
const DIM_PROM_BG     = ['bg-blue-100',  'bg-emerald-100', 'bg-amber-100',  'bg-purple-100' ]
const DIM_PROM_TEXT   = ['text-blue-800','text-emerald-800','text-amber-800','text-purple-800']
const DIM_BADGE_BG    = ['bg-blue-100 text-blue-800', 'bg-emerald-100 text-emerald-800',
                          'bg-amber-100 text-amber-800', 'bg-purple-100 text-purple-800']

const INSTRUMENTO_LABELS: Record<string, string> = {
  OBSERVACION:       'Obs.',
  CUADERNO:          'Cuad.',
  EVALUACION_ESCRITA:'Eval. Esc.',
  EVALUACION_ORAL:   'Eval. Oral',
  DEFENSA:           'Defensa',
  PIZARRA:           'Pizarra',
  OTRO:              'Otro',
}

const ESCALA_COLORS: Record<string, string> = {
  ED: 'bg-red-100 text-red-700',
  DA: 'bg-yellow-100 text-yellow-700',
  DO: 'bg-blue-100 text-blue-700',
  DP: 'bg-green-100 text-green-700',
}

// ─── Sub-componente: celda de nota editable ───────────────────────────────────

function NotaCell({
  value,
  max,
  isSaving,
  readonly,
  onSave,
}: {
  value:    number | null
  max:      number
  isSaving: boolean
  readonly?: boolean
  onSave:   (puntaje: number | null) => Promise<void>
}) {
  const [local, setLocal] = useState<string>(value != null ? String(value) : '')
  const prevRef = useRef<string>(local)
  const toast   = useToast()

  // Sync when value changes externally (e.g. after reload)
  if (value != null ? String(value) !== prevRef.current && !isSaving : local !== '' && prevRef.current !== '') {
    // ignore mid-typing
  }

  const handleBlur = async () => {
    const raw = local.trim()
    const puntaje = raw === '' ? null : parseInt(raw, 10)

    if (raw !== '' && (isNaN(puntaje!) || puntaje! < 1 || puntaje! > max)) {
      toast.error(`Nota debe ser entre 1 y ${max}`)
      setLocal(value != null ? String(value) : '')
      return
    }

    const prev = value != null ? String(value) : ''
    if (raw === prev) return

    prevRef.current = raw
    try {
      await onSave(puntaje)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Error al guardar nota')
      setLocal(value != null ? String(value) : '')
    }
  }

  return (
    <input
      type="number"
      min={1}
      max={max}
      value={local}
      onChange={e => setLocal(e.target.value)}
      onBlur={handleBlur}
      disabled={isSaving || readonly}
      readOnly={readonly}
      className={`
        w-12 rounded border text-center text-sm py-0.5 px-1 tabindex-0
        ${isSaving || readonly ? 'bg-gray-100 text-gray-400 cursor-default' : 'bg-white'}
        border-gray-200 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400
        [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none
      `}
    />
  )
}

// ─── Sub-componente: panel de gestión de indicadores ─────────────────────────

function IndicadoresPanel({
  asignacion_id,
  trimestre_id,
  dimensiones,
  onAdd,
  onUpdate,
  onDelete,
}: {
  asignacion_id: string
  trimestre_id?: string
  dimensiones:   DimensionPlanilla[]
  onAdd:    (data: CreateIndicadorData) => Promise<void>
  onUpdate: (id: string, data: Partial<Omit<CreateIndicadorData, 'asignacion_id' | 'dimension_id'>>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const toast = useToast()
  const [adding,   setAdding]   = useState(false)
  const [editId,   setEditId]   = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const EMPTY_FORM = {
    dimension_id:     '',
    nombre:           '',
    instrumento:      Instrumento.EVALUACION_ESCRITA,
    fecha_aplicacion: '',
    es_parcial:       false,
    orden:            0,
  }
  const [form, setForm] = useState(EMPTY_FORM)

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setAdding(true)
    try {
      await onAdd({ ...form, asignacion_id, ...(trimestre_id ? { trimestre_id } : {}) })
      toast.success('Indicador creado')
      setForm(EMPTY_FORM)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Error al crear indicador')
    } finally {
      setAdding(false)
    }
  }

  const handleDelete = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar el indicador "${nombre}"? Solo se puede si no tiene notas registradas.`)) return
    setDeleting(id)
    try {
      await onDelete(id)
      toast.success('Indicador eliminado')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Error al eliminar')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Indicadores existentes por dimensión */}
      {dimensiones.map((dim, idx) => (
        <div key={dim.id}>
          <div className={`rounded-t-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wide ${DIM_BADGE_BG[idx] ?? 'bg-gray-100 text-gray-700'}`}>
            {dim.nombre} (máx {dim.puntaje_max} pts)
          </div>
          <div className="rounded-b-lg border border-t-0 border-gray-200 bg-white divide-y divide-gray-50">
            {dim.indicadores.length === 0 && (
              <p className="px-3 py-2 text-xs text-gray-400 italic">Sin indicadores</p>
            )}
            {dim.indicadores.map(ind => (
              <div key={ind.id} className="flex items-start gap-2 px-3 py-2 text-sm group">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 truncate">{ind.nombre}</p>
                  <p className="text-xs text-gray-400">
                    {INSTRUMENTO_LABELS[ind.instrumento] ?? ind.instrumento}
                    {ind.fecha_aplicacion ? ` · ${ind.fecha_aplicacion.slice(0, 10)}` : ''}
                    {ind.es_parcial ? ' · Parcial' : ''}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(ind.id, ind.nombre)}
                  disabled={deleting === ind.id}
                  className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 text-xs px-1 py-0.5 rounded transition-opacity"
                >
                  {deleting === ind.id ? '…' : '✕'}
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Formulario nuevo indicador */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Agregar indicador</h4>
        <form onSubmit={handleAdd} className="space-y-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Dimensión</label>
            <select
              value={form.dimension_id}
              onChange={e => setForm(f => ({ ...f, dimension_id: e.target.value }))}
              required
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="">— Seleccionar —</option>
              {dimensiones.map((dim, idx) => (
                <option key={dim.id} value={dim.id}>
                  {dim.nombre} (máx {dim.puntaje_max})
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Nombre</label>
            <input
              type="text"
              value={form.nombre}
              onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
              placeholder="Ej: Examen parcial unidad 1"
              required
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex gap-2">
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-xs font-medium text-gray-600">Instrumento</label>
              <select
                value={form.instrumento}
                onChange={e => setForm(f => ({ ...f, instrumento: e.target.value as Instrumento }))}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                {Object.values(Instrumento).map(v => (
                  <option key={v} value={v}>{INSTRUMENTO_LABELS[v] ?? v}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1 flex-1">
              <label className="text-xs font-medium text-gray-600">Fecha</label>
              <input
                type="date"
                value={form.fecha_aplicacion}
                onChange={e => setForm(f => ({ ...f, fecha_aplicacion: e.target.value }))}
                required
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex flex-col gap-1 w-20">
              <label className="text-xs font-medium text-gray-600">Orden</label>
              <input
                type="number"
                min={0}
                value={form.orden}
                onChange={e => setForm(f => ({ ...f, orden: parseInt(e.target.value) || 0 }))}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.es_parcial}
                  onChange={e => setForm(f => ({ ...f, es_parcial: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                Parcial escrito
              </label>
            </div>
          </div>

          <Button type="submit" size="sm" loading={adding} className="w-full">
            + Agregar indicador
          </Button>
        </form>
      </div>
    </div>
  )
}

// ─── Vista móvil ──────────────────────────────────────────────────────────────

interface PlanillaMobileViewProps {
  asignacion_id:     string
  asignacion:        PlanillaData['asignacion']
  dimensiones:       DimensionPlanilla[]
  estudiantes:       PlanillaData['estudiantes']
  trimestres:        TrimestrePlanilla[]
  selectedTrimestre: TrimestrePlanilla | null
  trimestreCerrado:  boolean
  saving:            Set<string>
  panelOpen:         boolean
  onSelectTrimestre: (t: TrimestrePlanilla) => void
  onTogglePanel:     () => void
  onUpdateNota:      (indicador_id: string, estudiante_id: string, puntaje: number | null) => Promise<void>
  onAddIndicador:    (data: CreateIndicadorData) => Promise<void>
  onUpdateIndicador: (id: string, data: Partial<Omit<CreateIndicadorData, 'asignacion_id' | 'dimension_id'>>) => Promise<void>
  onDeleteIndicador: (id: string) => Promise<void>
}

function PlanillaMobileView({
  asignacion_id,
  asignacion,
  dimensiones,
  estudiantes,
  trimestres,
  selectedTrimestre,
  trimestreCerrado,
  saving,
  panelOpen,
  onSelectTrimestre,
  onTogglePanel,
  onUpdateNota,
  onAddIndicador,
  onUpdateIndicador,
  onDeleteIndicador,
}: PlanillaMobileViewProps) {
  const navigate = useNavigate()
  const [selectedEstIdx, setSelectedEstIdx] = useState(0)

  const estudiante = estudiantes[selectedEstIdx]

  return (
    <div className="space-y-4 pb-8">
      {/* Cabecera */}
      <div>
        <button onClick={() => navigate(-1)} className="mb-1 text-xs text-gray-400 hover:text-gray-600">
          ← Volver
        </button>
        <h1 className="text-lg font-bold text-gray-900">{asignacion.materia.nombre}</h1>
        <p className="text-sm text-gray-500">
          {asignacion.paralelo.grado.nombre} "{asignacion.paralelo.letra}" · Gestión {asignacion.gestion.anno}
        </p>
      </div>

      {/* Selector de trimestre */}
      <div className="flex rounded-lg border border-gray-200 overflow-hidden">
        {trimestres.map(t => (
          <button
            key={t.id}
            onClick={() => onSelectTrimestre(t)}
            className={`flex-1 px-3 py-2 text-xs font-semibold transition-colors ${
              selectedTrimestre?.id === t.id ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'
            } ${t.cerrado ? 'opacity-60' : ''}`}
          >
            {trimestreLabel(t.numero)}{t.cerrado ? ' 🔒' : ''}
          </button>
        ))}
      </div>

      {trimestreCerrado && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-2.5 text-sm text-amber-800">
          🔒 Trimestre cerrado — solo lectura.
        </div>
      )}

      {/* Selector de estudiante */}
      {estudiantes.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Estudiante</label>
          <select
            value={selectedEstIdx}
            onChange={e => setSelectedEstIdx(Number(e.target.value))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            {estudiantes.map((est, i) => (
              <option key={est.id} value={i}>
                {i + 1}. {est.apellido}, {est.nombre}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Navegación entre estudiantes */}
      {estudiantes.length > 0 && (
        <div className="flex items-center justify-between">
          <button
            type="button"
            disabled={selectedEstIdx === 0}
            onClick={() => setSelectedEstIdx(i => Math.max(0, i - 1))}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm disabled:opacity-40"
          >
            ← Anterior
          </button>
          <span className="text-xs text-gray-400">{selectedEstIdx + 1} de {estudiantes.length}</span>
          <button
            type="button"
            disabled={selectedEstIdx === estudiantes.length - 1}
            onClick={() => setSelectedEstIdx(i => Math.min(estudiantes.length - 1, i + 1))}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm disabled:opacity-40"
          >
            Siguiente →
          </button>
        </div>
      )}

      {/* Notas del estudiante seleccionado por dimensión */}
      {estudiante && dimensiones.map((dim, idx) => (
        <div key={dim.id} className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
          <div className={`${DIM_HEADER_BG[idx] ?? 'bg-gray-600'} px-4 py-2 flex items-center justify-between`}>
            <span className="text-white text-sm font-bold">{dim.nombre}</span>
            <span className="text-white/70 text-xs">máx {dim.puntaje_max} pts</span>
          </div>

          <div className="divide-y divide-gray-50">
            {dim.indicadores.length === 0 ? (
              <p className="px-4 py-3 text-sm text-gray-400 italic">Sin indicadores</p>
            ) : dim.indicadores.map(ind => {
              const savKey = `${ind.id}-${estudiante.id}`
              return (
                <div key={ind.id} className="px-4 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">{ind.nombre}</p>
                    <p className="text-xs text-gray-400">
                      {INSTRUMENTO_LABELS[ind.instrumento] ?? ind.instrumento}
                      {ind.fecha_aplicacion ? ` · ${ind.fecha_aplicacion.slice(0, 10)}` : ''}
                    </p>
                  </div>
                  <NotaCell
                    value={estudiante.notas[ind.id] ?? null}
                    max={dim.puntaje_max}
                    isSaving={saving.has(savKey)}
                    readonly={trimestreCerrado}
                    onSave={p => onUpdateNota(ind.id, estudiante.id, p)}
                  />
                </div>
              )
            })}
          </div>

          {/* Promedio dimensión */}
          {dim.indicadores.length > 0 && (
            <div className={`${DIM_PROM_BG[idx] ?? 'bg-gray-100'} px-4 py-2 flex items-center justify-between`}>
              <span className={`text-xs font-semibold ${DIM_PROM_TEXT[idx] ?? 'text-gray-700'}`}>
                Promedio {dim.nombre}
              </span>
              <span className={`text-sm font-bold ${DIM_PROM_TEXT[idx] ?? 'text-gray-700'}`}>
                {estudiante.promedios[dim.id] ?? '—'}
              </span>
            </div>
          )}
        </div>
      ))}

      {/* Total + Escala */}
      {estudiante && (
        <div className="rounded-xl border-2 border-gray-800 bg-gray-800 text-white p-4 flex items-center justify-between">
          <span className="font-semibold">Total</span>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold">
              {estudiante.total ?? '—'}
            </span>
            {estudiante.escala && (
              <span className={`rounded px-3 py-1 text-sm font-bold ${ESCALA_COLORS[estudiante.escala] ?? ''}`}>
                {estudiante.escala}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Panel de indicadores (colapsable) */}
      {!trimestreCerrado && (
        <div>
          <button
            type="button"
            onClick={onTogglePanel}
            className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {panelOpen ? '✕ Cerrar panel indicadores' : '⚙ Gestionar indicadores'}
          </button>
          {panelOpen && (
            <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
              <IndicadoresPanel
                asignacion_id={asignacion_id}
                {...(selectedTrimestre?.id ? { trimestre_id: selectedTrimestre.id } : {})}
                dimensiones={dimensiones}
                onAdd={onAddIndicador}
                onUpdate={onUpdateIndicador}
                onDelete={onDeleteIndicador}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function PlanillaPage() {
  const { asignacion_id } = useParams<{ asignacion_id: string }>()
  const navigate = useNavigate()
  const toast    = useToast()

  const [panelOpen,        setPanelOpen]        = useState(false)
  const [selectedTrimestre, setSelectedTrimestre] = useState<TrimestrePlanilla | null>(null)
  const [initDone,          setInitDone]          = useState(false)

  const {
    data, loading, error, saving,
    updateNota, addIndicador, updateIndicador, deleteIndicador,
  } = usePlanilla(asignacion_id!, initDone ? selectedTrimestre?.id : undefined)

  // Auto-select active trimestre on first load
  useEffect(() => {
    if (!initDone && data) {
      const activo = getTrimestreActivo(data.asignacion.gestion.trimestres)
      setSelectedTrimestre(activo)
      setInitDone(true)
    }
  }, [data, initDone])

  const isMobile = useIsMobile()

  if (loading || !initDone) {
    return <div className="flex justify-center py-16"><Spinner /></div>
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
        <p className="text-red-600">{error ?? 'Error al cargar planilla'}</p>
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mt-4">
          ← Volver
        </Button>
      </div>
    )
  }

  const { asignacion, dimensiones, estudiantes } = data
  const trimestres    = asignacion.gestion.trimestres
  const trimestreCerrado = selectedTrimestre?.cerrado ?? false

  // Total de columnas de indicadores (para calcular colSpan)
  const totalIndicCols = dimensiones.reduce((s, d) => s + d.indicadores.length, 0)

  // ── Vista móvil ────────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <PlanillaMobileView
        asignacion_id={asignacion_id!}
        asignacion={asignacion}
        dimensiones={dimensiones}
        estudiantes={estudiantes}
        trimestres={trimestres}
        selectedTrimestre={selectedTrimestre}
        trimestreCerrado={trimestreCerrado}
        saving={saving}
        panelOpen={panelOpen}
        onSelectTrimestre={setSelectedTrimestre}
        onTogglePanel={() => setPanelOpen(p => !p)}
        onUpdateNota={updateNota}
        onAddIndicador={addIndicador}
        onUpdateIndicador={updateIndicador}
        onDeleteIndicador={deleteIndicador}
      />
    )
  }

  return (
    <div className="flex h-full gap-4">
      {/* ── Contenido principal ─────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 space-y-4">

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <button
              onClick={() => navigate(-1)}
              className="mb-1 text-xs text-gray-400 hover:text-gray-600"
            >
              ← Volver a mis materias
            </button>
            <h1 className="text-xl font-bold text-gray-900">
              {asignacion.materia.nombre}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-500">
              <span className="font-medium text-gray-700">
                {asignacion.paralelo.grado.nombre} "{asignacion.paralelo.letra}"
              </span>
              <span>·</span>
              <Badge variant="info">Gestión {asignacion.gestion.anno}</Badge>
              <span>·</span>
              <span>{asignacion.materia.campo.nombre}</span>
              <span>·</span>
              <span>Prof. {asignacion.docente.apellido}, {asignacion.docente.nombre}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Selector de trimestre */}
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              {trimestres.map(t => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTrimestre(t)}
                  className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                    selectedTrimestre?.id === t.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  } ${t.cerrado ? 'opacity-60' : ''}`}
                  title={t.cerrado ? 'Cerrado' : 'Abierto'}
                >
                  {trimestreLabel(t.numero)}
                  {t.cerrado && ' 🔒'}
                </button>
              ))}
            </div>

            <Button
              variant={panelOpen ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setPanelOpen(p => !p)}
              disabled={trimestreCerrado}
              title={trimestreCerrado ? 'Trimestre cerrado' : undefined}
            >
              {panelOpen ? '✕ Cerrar panel' : '⚙ Gestionar indicadores'}
            </Button>
          </div>
        </div>

        {/* Banner trimestre cerrado */}
        {trimestreCerrado && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 flex items-center gap-2">
            🔒 <strong>Trimestre cerrado</strong> — solo lectura. No se pueden registrar ni modificar notas.
          </div>
        )}

        {/* Resumen */}
        <p className="text-sm text-gray-400">
          {selectedTrimestre && <span>{trimestreLabel(selectedTrimestre.numero)} · </span>}
          {estudiantes.length} estudiante{estudiantes.length !== 1 ? 's' : ''} · {totalIndicCols} indicador{totalIndicCols !== 1 ? 'es' : ''}
        </p>

        {/* ── TABLA ─────────────────────────────────────────────────────────── */}
        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
          <table className="min-w-max text-sm border-collapse">
            <thead>
              {/* Fila 1: Grupos de dimensión */}
              <tr>
                <th
                  rowSpan={2}
                  className="sticky left-0 z-20 w-10 bg-gray-100 px-2 py-2 text-center text-xs font-semibold text-gray-500 border-b border-r border-gray-200"
                >
                  N°
                </th>
                <th
                  rowSpan={2}
                  className="sticky left-10 z-20 w-52 bg-gray-100 px-4 py-2 text-left text-xs font-semibold text-gray-500 border-b border-r border-gray-200 whitespace-nowrap"
                >
                  Apellidos y Nombres
                </th>

                {dimensiones.map((dim, idx) => (
                  <th
                    key={dim.id}
                    colSpan={dim.indicadores.length + 1}
                    className={`${DIM_HEADER_BG[idx] ?? 'bg-gray-600'} ${DIM_HEADER_TEXT[idx] ?? 'text-white'} px-2 py-1.5 text-center text-xs font-bold uppercase tracking-wider border-b border-r border-white/20`}
                  >
                    {dim.nombre} <span className="font-normal opacity-75">/ {dim.puntaje_max} pts</span>
                  </th>
                ))}

                <th
                  rowSpan={2}
                  className="bg-gray-800 text-white px-3 py-2 text-center text-xs font-bold uppercase border-b border-gray-700 whitespace-nowrap"
                >
                  TOTAL
                </th>
                <th
                  rowSpan={2}
                  className="bg-gray-800 text-white px-3 py-2 text-center text-xs font-bold uppercase border-b border-gray-700"
                >
                  ESCALA
                </th>
              </tr>

              {/* Fila 2: Columnas de indicadores + PROM por dimensión */}
              <tr>
                {dimensiones.map((dim, idx) => (
                  <Fragment key={dim.id}>
                    {dim.indicadores.map(ind => (
                      <th
                        key={ind.id}
                        className={`${DIM_CELL_BG[idx] ?? 'bg-gray-50'} border-r border-gray-200 px-1 py-1 text-center align-bottom`}
                        style={{ minWidth: '3.5rem', maxWidth: '4rem' }}
                      >
                        <div className="flex flex-col items-center gap-0.5">
                          <div
                            className="text-gray-700 font-medium"
                            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', height: '5rem', fontSize: '0.65rem', lineHeight: 1.2, overflow: 'hidden' }}
                            title={ind.nombre}
                          >
                            {ind.nombre}
                          </div>
                          <span className="text-gray-400 block leading-tight" style={{ fontSize: '0.6rem' }}>
                            {INSTRUMENTO_LABELS[ind.instrumento] ?? ind.instrumento}
                          </span>
                          <span className="text-gray-400 block leading-tight" style={{ fontSize: '0.6rem' }}>
                            {ind.fecha_aplicacion ? ind.fecha_aplicacion.slice(0, 10) : ''}
                          </span>
                        </div>
                      </th>
                    ))}
                    {/* Columna PROM de la dimensión */}
                    <th
                      className={`${DIM_PROM_BG[idx] ?? 'bg-gray-100'} ${DIM_PROM_TEXT[idx] ?? 'text-gray-700'} border-r border-gray-300 px-2 py-1 text-center text-xs font-bold whitespace-nowrap`}
                    >
                      PROM.
                    </th>
                  </Fragment>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {estudiantes.length === 0 && (
                <tr>
                  <td
                    colSpan={2 + totalIndicCols + dimensiones.length + 2}
                    className="py-10 text-center text-gray-400"
                  >
                    No hay estudiantes matriculados en este paralelo.
                  </td>
                </tr>
              )}

              {estudiantes.map((est, rowIdx) => (
                <tr key={est.id} className="hover:bg-gray-50 transition-colors">
                  {/* N° */}
                  <td className="sticky left-0 z-10 bg-white w-10 px-2 py-2 text-center text-xs text-gray-400 border-r border-gray-100">
                    {rowIdx + 1}
                  </td>

                  {/* Nombre */}
                  <td className="sticky left-10 z-10 bg-white w-52 px-4 py-2 border-r border-gray-100 whitespace-nowrap">
                    <span className="font-medium text-gray-800">{est.apellido},</span>{' '}
                    <span className="text-gray-600">{est.nombre}</span>
                  </td>

                  {/* Celdas por dimensión */}
                  {dimensiones.map((dim, idx) => (
                    <Fragment key={dim.id}>
                      {dim.indicadores.map(ind => {
                        const savKey = `${ind.id}-${est.id}`
                        return (
                          <td
                            key={ind.id}
                            className={`${DIM_CELL_BG[idx] ?? 'bg-gray-50'} border-r border-gray-100 px-1 py-1.5 text-center`}
                          >
                            <NotaCell
                              value={est.notas[ind.id] ?? null}
                              max={dim.puntaje_max}
                              isSaving={saving.has(savKey)}
                              readonly={trimestreCerrado}
                              onSave={p => updateNota(ind.id, est.id, p)}
                            />
                          </td>
                        )
                      })}

                      {/* PROM celda */}
                      <td
                        className={`${DIM_PROM_BG[idx] ?? 'bg-gray-100'} ${DIM_PROM_TEXT[idx] ?? 'text-gray-700'} border-r border-gray-300 px-3 py-2 text-center text-sm font-bold`}
                      >
                        {est.promedios[dim.id] != null ? est.promedios[dim.id] : <span className="text-gray-300">—</span>}
                      </td>
                    </Fragment>
                  ))}

                  {/* TOTAL */}
                  <td
                    className={`px-3 py-2 text-center text-sm font-bold border-r border-gray-200 ${
                      est.total != null && est.total < 51
                        ? 'text-red-600 bg-red-50'
                        : 'text-gray-800 bg-white'
                    }`}
                  >
                    {est.total != null ? est.total : <span className="text-gray-300">—</span>}
                  </td>

                  {/* ESCALA */}
                  <td className="px-3 py-2 text-center bg-white">
                    {est.escala ? (
                      <span className={`inline-block rounded px-2 py-0.5 text-xs font-bold ${ESCALA_COLORS[est.escala] ?? ''}`}>
                        {est.escala}
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Leyenda de escala */}
        <div className="flex flex-wrap gap-3 text-xs text-gray-500">
          <span>Escala:</span>
          {[
            { label: 'ED', range: '0–50',   cls: 'bg-red-100 text-red-700' },
            { label: 'DA', range: '51–68',  cls: 'bg-yellow-100 text-yellow-700' },
            { label: 'DO', range: '69–84',  cls: 'bg-blue-100 text-blue-700' },
            { label: 'DP', range: '85–100', cls: 'bg-green-100 text-green-700' },
          ].map(e => (
            <span key={e.label} className={`rounded px-1.5 py-0.5 font-semibold ${e.cls}`}>
              {e.label} ({e.range})
            </span>
          ))}
        </div>
      </div>

      {/* ── Panel lateral ────────────────────────────────────────────────────── */}
      {panelOpen && (
        <div className="w-72 flex-shrink-0">
          <div className="sticky top-4 rounded-xl border border-gray-200 bg-gray-50 p-4 shadow-sm space-y-4 max-h-[calc(100vh-7rem)] overflow-y-auto">
            <h3 className="font-semibold text-gray-800 text-sm">Gestionar indicadores</h3>
            <IndicadoresPanel
              asignacion_id={asignacion_id!}
              {...(selectedTrimestre?.id ? { trimestre_id: selectedTrimestre.id } : {})}
              dimensiones={dimensiones}
              onAdd={addIndicador}
              onUpdate={updateIndicador}
              onDelete={deleteIndicador}
            />
          </div>
        </div>
      )}
    </div>
  )
}
