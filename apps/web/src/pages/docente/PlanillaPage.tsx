import { useState, useRef, useEffect, Fragment } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { usePlanilla, type PlanillaData, type DimensionPlanilla, type IndicadorPlanilla, type CreateIndicadorData, type TrimestrePlanilla } from '../../hooks/usePlanilla'
import { useToast } from '../../components/ui/Toast'
import { ApiError, apiDownload } from '../../lib/api'
import { Button, Spinner, Badge } from '@edusync/ui'
import { getTrimestreActivo, trimestreLabel } from '../../lib/trimestre'
import { useIsMobile } from '../../hooks/useIsMobile'
import { IndicadorFormModal, type IndicadorFormValues } from '../../components/planilla/IndicadorFormModal'

const ES_AUTOEVAL = (nombre: string) => nombre === 'AUTOEVALUACION'

interface IndicadorModalState {
  mode:      'create' | 'edit'
  dimension: DimensionPlanilla
  indicador?: IndicadorPlanilla
}

// ─── Constantes de estilo por dimensión (índice 0-3 = SER, SABER, HACER, AUTO) ─

const DIM_HEADER_BG   = ['bg-blue-600',  'bg-emerald-600', 'bg-amber-600',  'bg-purple-600' ]
const DIM_HEADER_TEXT = ['text-white',   'text-white',     'text-white',    'text-white'    ]
const DIM_CELL_BG     = ['bg-blue-50 dark:bg-blue-950/30',   'bg-emerald-50 dark:bg-emerald-950/30',  'bg-amber-50 dark:bg-amber-950/30',   'bg-purple-50 dark:bg-purple-950/30'  ]
const DIM_PROM_BG     = ['bg-blue-100 dark:bg-blue-950/50',  'bg-emerald-100 dark:bg-emerald-950/50', 'bg-amber-100 dark:bg-amber-950/50',  'bg-purple-100 dark:bg-purple-950/50' ]
const DIM_PROM_TEXT   = ['text-blue-800 dark:text-blue-300','text-emerald-800 dark:text-emerald-300','text-amber-800 dark:text-amber-300','text-purple-800 dark:text-purple-300']
const DIM_BADGE_BG    = ['bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300', 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
                          'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300', 'bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300']

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
  ED: 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300',
  DA: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
  DO: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
  DP: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
}

// ─── Sub-componente: celda de nota editable ───────────────────────────────────

function NotaCell({
  value,
  max,
  isSaving,
  readonly,
  onSave,
  large,
  onSaved,
  inputRef,
}: {
  value:    number | null
  max:      number
  isSaving: boolean
  readonly?: boolean
  onSave:   (puntaje: number | null) => Promise<void>
  large?:   boolean
  onSaved?: () => void
  inputRef?: (el: HTMLInputElement | null) => void
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
      if (raw !== '' && raw !== prev) onSaved?.()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Error al guardar nota')
      setLocal(value != null ? String(value) : '')
    }
  }

  return (
    <input
      ref={inputRef}
      type="number"
      inputMode="numeric"
      pattern="[0-9]*"
      min={1}
      max={max}
      value={local}
      onChange={e => setLocal(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
      disabled={isSaving || readonly}
      readOnly={readonly}
      className={`
        rounded border text-center tabindex-0
        ${large ? 'w-16 h-11 text-base' : 'w-12 py-0.5 px-1 text-sm'}
        ${isSaving || readonly ? 'bg-surface-2 text-fg-muted cursor-default' : 'bg-surface text-fg'}
        border-border focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand
        [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none
      `}
    />
  )
}

// ─── Sub-componente: fila "+" para insertar un nuevo indicador ────────────────

function AgregarIndicadorRow({ onClick, dense }: { onClick: () => void; dense?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group/add w-full flex items-center gap-2 ${dense ? 'px-4 py-2' : 'px-4 py-2.5'} text-fg-muted hover:text-brand transition-colors`}
    >
      <span className="flex-1 border-t border-dashed border-border group-hover/add:border-brand transition-colors" />
      <span className="flex h-5 w-5 items-center justify-center rounded-full border border-dashed border-border group-hover/add:border-brand group-hover/add:bg-brand/10 text-xs font-bold transition-colors">+</span>
      <span className="text-xs font-medium">Añadir indicador</span>
      <span className="flex-1 border-t border-dashed border-border group-hover/add:border-brand transition-colors" />
    </button>
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
  onSelectTrimestre: (t: TrimestrePlanilla) => void
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
  onSelectTrimestre,
  onUpdateNota,
  onAddIndicador,
  onUpdateIndicador,
  onDeleteIndicador,
}: PlanillaMobileViewProps) {
  const navigate = useNavigate()
  const [selectedEstIdx, setSelectedEstIdx] = useState(0)
  const [indicadorModal, setIndicadorModal] = useState<IndicadorModalState | null>(null)
  const [dlState, setDlState] = useState<'idle' | 'pdf' | 'xlsx'>('idle')
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map())

  async function descargarRegistro(tipo: 'pdf' | 'xlsx') {
    if (!selectedTrimestre) return
    setDlState(tipo)
    try {
      await apiDownload(
        `/planilla/${asignacion_id}/registro/${tipo === 'pdf' ? 'pdf' : 'excel'}?trimestre_id=${selectedTrimestre.id}`,
        `registro_${asignacion.materia.nombre}_T${selectedTrimestre.numero}.${tipo === 'pdf' ? 'pdf' : 'xlsx'}`,
      )
    } finally { setDlState('idle') }
  }

  const estudiante = estudiantes[selectedEstIdx]
  const flatIndicadores = dimensiones.flatMap(d => d.indicadores)

  function focusNext(indicadorId: string) {
    const i = flatIndicadores.findIndex(ind => ind.id === indicadorId)
    const next = flatIndicadores[i + 1]
    if (next) inputRefs.current.get(next.id)?.focus()
  }

  async function handleModalSubmit(values: Partial<IndicadorFormValues>) {
    if (!indicadorModal) return
    if (indicadorModal.mode === 'create') {
      await onAddIndicador({
        asignacion_id,
        dimension_id: indicadorModal.dimension.id,
        ...(selectedTrimestre?.id ? { trimestre_id: selectedTrimestre.id } : {}),
        nombre:           values.nombre!,
        instrumento:      values.instrumento!,
        ...(values.instrumento_otro ? { instrumento_otro: values.instrumento_otro } : {}),
        fecha_aplicacion: values.fecha_aplicacion!,
        es_parcial:       values.es_parcial ?? false,
        orden:            indicadorModal.dimension.indicadores.length,
      })
    } else if (indicadorModal.indicador) {
      await onUpdateIndicador(indicadorModal.indicador.id, values)
    }
  }

  return (
    <div className="space-y-4 pb-24">
      {/* Cabecera */}
      <div>
        <button onClick={() => navigate(-1)} className="mb-1 text-xs text-fg-muted hover:text-fg">
          ← Volver
        </button>
        <h1 className="text-lg font-bold text-fg">{asignacion.materia.nombre}</h1>
        <p className="text-sm text-fg-muted">
          {asignacion.paralelo.grado.nombre} "{asignacion.paralelo.letra}" · Gestión {asignacion.gestion.anno}
        </p>
      </div>

      {/* Selector de trimestre + Centralizador */}
      <div className="flex gap-2">
        <div className="flex flex-1 rounded-lg border border-border overflow-hidden">
          {trimestres.map(t => (
            <button
              key={t.id}
              onClick={() => onSelectTrimestre(t)}
              className={`flex-1 px-3 py-2 text-xs font-semibold transition-colors ${
                selectedTrimestre?.id === t.id ? 'bg-brand text-brand-fg' : 'bg-surface text-fg-muted'
              } ${t.cerrado ? 'opacity-60' : ''}`}
            >
              {trimestreLabel(t.numero)}{t.cerrado ? ' 🔒' : ''}
            </button>
          ))}
        </div>
        <button
          onClick={() => navigate('centralizador')}
          className="flex-shrink-0 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-semibold text-fg-muted hover:bg-surface-2 hover:text-fg transition-colors"
        >
          📊 Centralizador
        </button>
      </div>

      {/* Exportar el registro del trimestre actual */}
      <div className="flex gap-2">
        <button
          onClick={() => descargarRegistro('pdf')}
          disabled={!selectedTrimestre || dlState !== 'idle'}
          className="flex-1 rounded-lg border border-blue-600 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 disabled:opacity-50"
        >
          {dlState === 'pdf' ? '…' : '📄 PDF'}
        </button>
        <button
          onClick={() => descargarRegistro('xlsx')}
          disabled={!selectedTrimestre || dlState !== 'idle'}
          className="flex-1 rounded-lg border border-green-600 px-3 py-1.5 text-xs font-semibold text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/30 disabled:opacity-50"
        >
          {dlState === 'xlsx' ? '…' : '📗 Excel'}
        </button>
      </div>

      {trimestreCerrado && (
        <div className="rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 px-4 py-2.5 text-sm text-amber-800 dark:text-amber-400">
          🔒 Trimestre cerrado — solo lectura.
        </div>
      )}

      {/* Selector de estudiante */}
      {estudiantes.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-fg-muted mb-1">Estudiante</label>
          <select
            value={selectedEstIdx}
            onChange={e => setSelectedEstIdx(Number(e.target.value))}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg focus:border-brand focus:outline-none"
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
            className="rounded-lg border border-border px-3 py-1.5 text-sm text-fg disabled:opacity-40"
          >
            ← Anterior
          </button>
          <span className="text-xs text-fg-muted">{selectedEstIdx + 1} de {estudiantes.length}</span>
          <button
            type="button"
            disabled={selectedEstIdx === estudiantes.length - 1}
            onClick={() => setSelectedEstIdx(i => Math.min(estudiantes.length - 1, i + 1))}
            className="rounded-lg border border-border px-3 py-1.5 text-sm text-fg disabled:opacity-40"
          >
            Siguiente →
          </button>
        </div>
      )}

      {/* Notas del estudiante seleccionado por dimensión */}
      {estudiante && dimensiones.map((dim, idx) => (
        <div key={dim.id} className="rounded-xl border border-border bg-surface overflow-hidden shadow-sm">
          <div className={`${DIM_HEADER_BG[idx] ?? 'bg-gray-600'} px-4 py-2 flex items-center justify-between`}>
            <span className="text-white text-sm font-bold">{dim.nombre}</span>
            <span className="text-white/70 text-xs">máx {dim.puntaje_max} pts</span>
          </div>

          <div className="divide-y divide-border/60">
            {dim.indicadores.length === 0 && (
              <p className="px-4 py-3 text-sm text-fg-muted italic">Sin indicadores</p>
            )}
            {dim.indicadores.map(ind => {
              const savKey = `${ind.id}-${estudiante.id}`
              return (
                <div key={ind.id} className="px-4 py-2.5 flex items-center gap-2">
                  {!trimestreCerrado && (
                    <button
                      type="button"
                      onClick={() => setIndicadorModal({ mode: 'edit', dimension: dim, indicador: ind })}
                      className="flex-shrink-0 text-fg-muted hover:text-brand p-1 -ml-1"
                      aria-label="Editar indicador"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-fg">{ind.nombre}</p>
                    <p className="text-xs text-fg-muted">
                      {ind.instrumento === 'OTRO' && ind.instrumento_otro ? ind.instrumento_otro : (INSTRUMENTO_LABELS[ind.instrumento] ?? ind.instrumento)}
                      {ind.fecha_aplicacion ? ` · ${ind.fecha_aplicacion.slice(0, 10)}` : ''}
                    </p>
                  </div>
                  <NotaCell
                    large
                    value={estudiante.notas[ind.id] ?? null}
                    max={dim.puntaje_max}
                    isSaving={saving.has(savKey)}
                    readonly={trimestreCerrado}
                    onSave={p => onUpdateNota(ind.id, estudiante.id, p)}
                    onSaved={() => focusNext(ind.id)}
                    inputRef={el => {
                      if (el) inputRefs.current.set(ind.id, el)
                      else inputRefs.current.delete(ind.id)
                    }}
                  />
                </div>
              )
            })}
            {!trimestreCerrado && !ES_AUTOEVAL(dim.nombre) && (
              <AgregarIndicadorRow dense onClick={() => setIndicadorModal({ mode: 'create', dimension: dim })} />
            )}
          </div>

          {/* Promedio dimensión */}
          {dim.indicadores.length > 0 && (
            <div className={`${DIM_PROM_BG[idx] ?? 'bg-surface-2'} px-4 py-2 flex items-center justify-between`}>
              <span className={`text-xs font-semibold ${DIM_PROM_TEXT[idx] ?? 'text-fg'}`}>
                Promedio {dim.nombre}
              </span>
              <span className={`text-sm font-bold ${DIM_PROM_TEXT[idx] ?? 'text-fg'}`}>
                {estudiante.promedios[dim.id] ?? '—'}
              </span>
            </div>
          )}
        </div>
      ))}

      {/* Barra inferior fija: Total + Escala del estudiante actual */}
      {estudiante && (
        <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-slate-700 bg-slate-800/95 dark:bg-slate-900/95 backdrop-blur-sm text-white px-4 py-3 flex items-center justify-between shadow-lg">
          <div className="min-w-0">
            <p className="text-xs text-white/60 truncate">{estudiante.apellido}, {estudiante.nombre}</p>
            <span className="font-semibold text-sm">Total</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold">{estudiante.total ?? '—'}</span>
            {estudiante.escala && (
              <span className={`rounded px-3 py-1 text-sm font-bold ${ESCALA_COLORS[estudiante.escala] ?? ''}`}>
                {estudiante.escala}
              </span>
            )}
          </div>
        </div>
      )}

      {indicadorModal && (
        <IndicadorFormModal
          mode={indicadorModal.mode}
          dimensionNombre={indicadorModal.dimension.nombre}
          dimensionMaxPts={indicadorModal.dimension.puntaje_max}
          dateOnly={ES_AUTOEVAL(indicadorModal.dimension.nombre)}
          {...(indicadorModal.indicador ? { initial: {
            nombre:           indicadorModal.indicador.nombre,
            instrumento:      indicadorModal.indicador.instrumento,
            fecha_aplicacion: indicadorModal.indicador.fecha_aplicacion.slice(0, 10),
            es_parcial:       indicadorModal.indicador.es_parcial,
          } } : {})}
          onSubmit={handleModalSubmit}
          {...(indicadorModal.mode === 'edit' && indicadorModal.indicador
            ? { onDelete: () => onDeleteIndicador(indicadorModal.indicador!.id) }
            : {})}
          onClose={() => setIndicadorModal(null)}
        />
      )}
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function PlanillaPage() {
  const { asignacion_id } = useParams<{ asignacion_id: string }>()
  const navigate = useNavigate()

  const [selectedTrimestre, setSelectedTrimestre] = useState<TrimestrePlanilla | null>(null)
  const [initDone,          setInitDone]          = useState(false)
  const [indicadorModal,    setIndicadorModal]    = useState<IndicadorModalState | null>(null)
  const [dlState,           setDlState]           = useState<'idle' | 'pdf' | 'xlsx'>('idle')

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
      <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-8 text-center">
        <p className="text-red-600 dark:text-red-400">{error ?? 'Error al cargar planilla'}</p>
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mt-4">
          ← Volver
        </Button>
      </div>
    )
  }

  const { asignacion, dimensiones, estudiantes } = data
  const trimestres    = asignacion.gestion.trimestres
  const trimestreCerrado = selectedTrimestre?.cerrado ?? false

  // Total de columnas de indicadores (para calcular colSpan) + columnas "+" (una por dimensión editable, Autoevaluación no)
  const totalIndicCols = dimensiones.reduce((s, d) => s + d.indicadores.length, 0)
  const dimsEditables   = dimensiones.filter(d => !ES_AUTOEVAL(d.nombre))

  async function handleModalSubmit(values: Partial<IndicadorFormValues>) {
    if (!indicadorModal) return
    if (indicadorModal.mode === 'create') {
      await addIndicador({
        asignacion_id: asignacion_id!,
        dimension_id:  indicadorModal.dimension.id,
        ...(selectedTrimestre?.id ? { trimestre_id: selectedTrimestre.id } : {}),
        nombre:           values.nombre!,
        instrumento:      values.instrumento!,
        ...(values.instrumento_otro ? { instrumento_otro: values.instrumento_otro } : {}),
        fecha_aplicacion: values.fecha_aplicacion!,
        es_parcial:       values.es_parcial ?? false,
        orden:            indicadorModal.dimension.indicadores.length,
      })
    } else if (indicadorModal.indicador) {
      await updateIndicador(indicadorModal.indicador.id, values)
    }
  }

  async function descargarRegistro(tipo: 'pdf' | 'xlsx') {
    if (!selectedTrimestre) return
    setDlState(tipo)
    try {
      await apiDownload(
        `/planilla/${asignacion_id}/registro/${tipo === 'pdf' ? 'pdf' : 'excel'}?trimestre_id=${selectedTrimestre.id}`,
        `registro_${asignacion.materia.nombre}_T${selectedTrimestre.numero}.${tipo === 'pdf' ? 'pdf' : 'xlsx'}`,
      )
    } finally { setDlState('idle') }
  }

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
        onSelectTrimestre={setSelectedTrimestre}
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
              className="mb-1 text-xs text-fg-muted hover:text-fg"
            >
              ← Volver a mis materias
            </button>
            <h1 className="text-xl font-bold text-fg">
              {asignacion.materia.nombre}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-fg-muted">
              <span className="font-medium text-fg">
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
            <div className="flex rounded-lg border border-border overflow-hidden">
              {trimestres.map(t => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTrimestre(t)}
                  className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                    selectedTrimestre?.id === t.id
                      ? 'bg-brand text-brand-fg'
                      : 'bg-surface text-fg-muted hover:bg-surface-2'
                  } ${t.cerrado ? 'opacity-60' : ''}`}
                  title={t.cerrado ? 'Cerrado' : 'Abierto'}
                >
                  {trimestreLabel(t.numero)}
                  {t.cerrado && ' 🔒'}
                </button>
              ))}
            </div>

            <Button variant="ghost" size="sm" onClick={() => navigate('centralizador')}>
              📊 Centralizador
            </Button>

            <div className="flex gap-2">
              <button
                onClick={() => descargarRegistro('pdf')}
                disabled={!selectedTrimestre || dlState !== 'idle'}
                className="rounded-lg border border-blue-600 px-3 py-1.5 text-sm text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 disabled:opacity-50"
              >
                {dlState === 'pdf' ? '…' : '📄 PDF'}
              </button>
              <button
                onClick={() => descargarRegistro('xlsx')}
                disabled={!selectedTrimestre || dlState !== 'idle'}
                className="rounded-lg border border-green-600 px-3 py-1.5 text-sm text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/30 disabled:opacity-50"
              >
                {dlState === 'xlsx' ? '…' : '📗 Excel'}
              </button>
            </div>
          </div>
        </div>

        {/* Banner trimestre cerrado */}
        {trimestreCerrado && (
          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 px-4 py-3 text-sm text-amber-800 dark:text-amber-400 flex items-center gap-2">
            🔒 <strong>Trimestre cerrado</strong> — solo lectura. No se pueden registrar ni modificar notas.
          </div>
        )}

        {/* Resumen */}
        <p className="text-sm text-fg-muted">
          {selectedTrimestre && <span>{trimestreLabel(selectedTrimestre.numero)} · </span>}
          {estudiantes.length} estudiante{estudiantes.length !== 1 ? 's' : ''} · {totalIndicCols} indicador{totalIndicCols !== 1 ? 'es' : ''}
        </p>

        {/* ── TABLA ─────────────────────────────────────────────────────────── */}
        <div className="overflow-x-auto rounded-xl border border-border shadow-sm">
          <table className="min-w-max text-sm border-collapse">
            <thead>
              {/* Fila 1: Grupos de dimensión */}
              <tr>
                <th
                  rowSpan={2}
                  className="sticky left-0 z-20 w-10 bg-surface-2 px-2 py-2 text-center text-xs font-semibold text-fg-muted border-b border-r border-border"
                >
                  N°
                </th>
                <th
                  rowSpan={2}
                  className="sticky left-10 z-20 w-52 bg-surface-2 px-4 py-2 text-left text-xs font-semibold text-fg-muted border-b border-r border-border whitespace-nowrap"
                >
                  Apellidos y Nombres
                </th>

                {dimensiones.map((dim, idx) => (
                  <th
                    key={dim.id}
                    colSpan={dim.indicadores.length + (ES_AUTOEVAL(dim.nombre) ? 0 : 1) + 1}
                    className={`${DIM_HEADER_BG[idx] ?? 'bg-gray-600'} ${DIM_HEADER_TEXT[idx] ?? 'text-white'} px-2 py-1.5 text-center text-xs font-bold uppercase tracking-wider border-b border-r border-white/20`}
                  >
                    {dim.nombre} <span className="font-normal opacity-75">/ {dim.puntaje_max} pts</span>
                  </th>
                ))}

                <th
                  rowSpan={2}
                  className="bg-slate-800 dark:bg-slate-900 text-white px-3 py-2 text-center text-xs font-bold uppercase border-b border-slate-700 whitespace-nowrap"
                >
                  TOTAL
                </th>
                <th
                  rowSpan={2}
                  className="bg-slate-800 dark:bg-slate-900 text-white px-3 py-2 text-center text-xs font-bold uppercase border-b border-slate-700"
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
                        className={`group relative ${DIM_CELL_BG[idx] ?? 'bg-bg'} border-r border-border px-1 py-1 text-center align-bottom`}
                        style={{ minWidth: '3.5rem', maxWidth: '4rem' }}
                      >
                        {!trimestreCerrado && (
                          <button
                            type="button"
                            onClick={() => setIndicadorModal({ mode: 'edit', dimension: dim, indicador: ind })}
                            className="absolute top-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 rounded bg-surface p-0.5 text-fg-muted hover:text-brand shadow transition-opacity z-10"
                            aria-label="Editar indicador"
                          >
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        )}
                        <div className="flex flex-col items-center gap-0.5">
                          <div
                            className="text-fg font-medium"
                            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', height: '5rem', fontSize: '0.65rem', lineHeight: 1.2, overflow: 'hidden' }}
                            title={ind.nombre}
                          >
                            {ind.nombre}
                          </div>
                          <span className="text-fg-muted block leading-tight" style={{ fontSize: '0.6rem' }}>
                            {ind.instrumento === 'OTRO' && ind.instrumento_otro ? ind.instrumento_otro : (INSTRUMENTO_LABELS[ind.instrumento] ?? ind.instrumento)}
                          </span>
                          <span className="text-fg-muted block leading-tight" style={{ fontSize: '0.6rem' }}>
                            {ind.fecha_aplicacion ? ind.fecha_aplicacion.slice(0, 10) : ''}
                          </span>
                        </div>
                      </th>
                    ))}
                    {/* Columna "+" para añadir un indicador a esta dimensión (no aplica a Autoevaluación) */}
                    {!ES_AUTOEVAL(dim.nombre) && (
                      <th className={`${DIM_CELL_BG[idx] ?? 'bg-bg'} border-r border-dashed border-border px-1 py-1 text-center align-middle`}>
                        {!trimestreCerrado && (
                          <button
                            type="button"
                            onClick={() => setIndicadorModal({ mode: 'create', dimension: dim })}
                            title="Añadir indicador"
                            className="flex h-5 w-5 mx-auto items-center justify-center rounded-full border border-dashed border-fg-muted text-fg-muted hover:border-brand hover:text-brand hover:bg-brand/10 transition-colors"
                          >
                            +
                          </button>
                        )}
                      </th>
                    )}
                    {/* Columna PROM de la dimensión */}
                    <th
                      className={`${DIM_PROM_BG[idx] ?? 'bg-surface-2'} ${DIM_PROM_TEXT[idx] ?? 'text-fg'} border-r border-border px-2 py-1 text-center text-xs font-bold whitespace-nowrap`}
                    >
                      PROM.
                    </th>
                  </Fragment>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {estudiantes.length === 0 && (
                <tr>
                  <td
                    colSpan={2 + totalIndicCols + dimsEditables.length + dimensiones.length + 2}
                    className="py-10 text-center text-fg-muted"
                  >
                    No hay estudiantes matriculados en este paralelo.
                  </td>
                </tr>
              )}

              {estudiantes.map((est, rowIdx) => (
                <tr key={est.id} className="hover:bg-surface-2/60 transition-colors">
                  {/* N° */}
                  <td className="sticky left-0 z-10 bg-surface w-10 px-2 py-2 text-center text-xs text-fg-muted border-r border-border">
                    {rowIdx + 1}
                  </td>

                  {/* Nombre */}
                  <td className="sticky left-10 z-10 bg-surface w-52 px-4 py-2 border-r border-border whitespace-nowrap">
                    <span className="font-medium text-fg">{est.apellido},</span>{' '}
                    <span className="text-fg-muted">{est.nombre}</span>
                  </td>

                  {/* Celdas por dimensión */}
                  {dimensiones.map((dim, idx) => (
                    <Fragment key={dim.id}>
                      {dim.indicadores.map(ind => {
                        const savKey = `${ind.id}-${est.id}`
                        return (
                          <td
                            key={ind.id}
                            className={`${DIM_CELL_BG[idx] ?? 'bg-bg'} border-r border-border px-1 py-1.5 text-center`}
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

                      {/* Celda vacía bajo la columna "+" (mantiene alineación de columnas) */}
                      {!ES_AUTOEVAL(dim.nombre) && (
                        <td className={`${DIM_CELL_BG[idx] ?? 'bg-bg'} border-r border-dashed border-border`} />
                      )}

                      {/* PROM celda */}
                      <td
                        className={`${DIM_PROM_BG[idx] ?? 'bg-surface-2'} ${DIM_PROM_TEXT[idx] ?? 'text-fg'} border-r border-border px-3 py-2 text-center text-sm font-bold`}
                      >
                        {est.promedios[dim.id] != null ? est.promedios[dim.id] : <span className="text-fg-muted/50">—</span>}
                      </td>
                    </Fragment>
                  ))}

                  {/* TOTAL */}
                  <td
                    className={`px-3 py-2 text-center text-sm font-bold border-r border-border ${
                      est.total != null && est.total < 51
                        ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30'
                        : 'text-fg bg-surface'
                    }`}
                  >
                    {est.total != null ? est.total : <span className="text-fg-muted/50">—</span>}
                  </td>

                  {/* ESCALA */}
                  <td className="px-3 py-2 text-center bg-surface">
                    {est.escala ? (
                      <span className={`inline-block rounded px-2 py-0.5 text-xs font-bold ${ESCALA_COLORS[est.escala] ?? ''}`}>
                        {est.escala}
                      </span>
                    ) : (
                      <span className="text-fg-muted/50">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Leyenda de escala */}
        <div className="flex flex-wrap gap-3 text-xs text-fg-muted">
          <span>Escala:</span>
          {[
            { label: 'ED', range: '0–50',   cls: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400' },
            { label: 'DA', range: '51–68',  cls: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400' },
            { label: 'DO', range: '69–84',  cls: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400' },
            { label: 'DP', range: '85–100', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400' },
          ].map(e => (
            <span key={e.label} className={`rounded px-1.5 py-0.5 font-semibold ${e.cls}`}>
              {e.label} ({e.range})
            </span>
          ))}
        </div>
      </div>

      {indicadorModal && (
        <IndicadorFormModal
          mode={indicadorModal.mode}
          dimensionNombre={indicadorModal.dimension.nombre}
          dimensionMaxPts={indicadorModal.dimension.puntaje_max}
          dateOnly={ES_AUTOEVAL(indicadorModal.dimension.nombre)}
          {...(indicadorModal.indicador ? { initial: {
            nombre:           indicadorModal.indicador.nombre,
            instrumento:      indicadorModal.indicador.instrumento,
            fecha_aplicacion: indicadorModal.indicador.fecha_aplicacion.slice(0, 10),
            es_parcial:       indicadorModal.indicador.es_parcial,
          } } : {})}
          onSubmit={handleModalSubmit}
          {...(indicadorModal.mode === 'edit' && indicadorModal.indicador
            ? { onDelete: () => deleteIndicador(indicadorModal.indicador!.id) }
            : {})}
          onClose={() => setIndicadorModal(null)}
        />
      )}
    </div>
  )
}
