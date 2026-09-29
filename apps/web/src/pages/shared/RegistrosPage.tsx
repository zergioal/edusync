import { useState, useEffect, useCallback, useRef, Fragment } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../../lib/api'
import { useToast } from '../../components/ui/Toast'
import { useGestionActiva } from '../../hooks/useGestionActiva'
import { usePlanilla } from '../../hooks/usePlanilla'
import { getTrimestreActivo, trimestreLabel } from '../../lib/trimestre'
import { abbreviateGrado, NIVEL_STYLES, NIVEL_FALLBACK } from '../../lib/cursoDisplay'
import { Spinner } from '@edusync/ui'
import { Icon } from '../../components/ui/Icon'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ParaleloCard {
  id:    string
  letra: string
  grado: { nombre: string; nivel: { nombre: string } }
}

interface AsignacionCard {
  id:      string
  docente: { usuario: { nombre: string; apellido: string } }
  materia: {
    nombre:           string
    campo:            { nombre: string }
    es_subarea_de_id: string | null
    parent_materia:   { nombre: string } | null
  }
}

type Vista = 'cursos' | 'materias' | 'planilla'

// ─── Estilo por dimensión (índice 0-3 = SER, SABER, HACER, AUTO) — mismos
// colores que la planilla del docente, para que se reconozca de un vistazo ────

const DIM_HEADER_BG = ['bg-blue-600',  'bg-emerald-600', 'bg-amber-600',  'bg-purple-600']
const DIM_CELL_BG   = ['bg-blue-50 dark:bg-blue-950/30',  'bg-emerald-50 dark:bg-emerald-950/30', 'bg-amber-50 dark:bg-amber-950/30',  'bg-purple-50 dark:bg-purple-950/30']
const DIM_PROM_BG   = ['bg-blue-100 dark:bg-blue-950/50', 'bg-emerald-100 dark:bg-emerald-950/50','bg-amber-100 dark:bg-amber-950/50', 'bg-purple-100 dark:bg-purple-950/50']
const DIM_PROM_TEXT = ['text-blue-800 dark:text-blue-300','text-emerald-800 dark:text-emerald-300','text-amber-800 dark:text-amber-300','text-purple-800 dark:text-purple-300']

const INSTRUMENTO_LABELS: Record<string, string> = {
  OBSERVACION:        'Obs.',
  CUADERNO:           'Cuad.',
  EVALUACION_ESCRITA: 'Eval. Esc.',
  EVALUACION_ORAL:    'Eval. Oral',
  DEFENSA:            'Defensa',
  PIZARRA:            'Pizarra',
  LISTA_COTEJO:       'Lista de cotejo',
  RUBRICA:            'Rúbrica',
  GUIA_OBSERVACION:   'Guía de observación',
  PRUEBA_ESCRITA:     'Prueba escrita',
  FICHA_TRABAJO:      'Ficha de trabajo',
  OTRO:               'Otro',
}

const ESCALA_COLORS: Record<string, string> = {
  ED: 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300',
  DA: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
  DO: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
  DP: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
}

// ─── Planilla de solo lectura ───────────────────────────────────────────────

function PlanillaLectura({ asignacionId, onBack }: { asignacionId: string; onBack: () => void }) {
  const [trimestreId, setTrimestreId] = useState('')
  const [initDone,    setInitDone]    = useState(false)
  const { data, loading, error } = usePlanilla(asignacionId, trimestreId || undefined)

  // Al primer cargar (sin trimestre_id, para conocer la lista de trimestres de
  // la gestión) seleccionamos el trimestre activo automáticamente — mismo
  // patrón que usa la planilla del docente.
  useEffect(() => {
    if (!initDone && data) {
      const activo = getTrimestreActivo(data.asignacion.gestion.trimestres)
      if (activo) setTrimestreId(activo.id)
      setInitDone(true)
    }
  }, [data, initDone])

  if (loading || !initDone) return <div className="flex justify-center py-16"><Spinner /></div>
  if (error || !data) {
    return (
      <div className="space-y-4">
        <BackLink onClick={onBack} label="Volver a materias" />
        <div className="py-12 text-center text-sm text-fg-muted">No se pudo cargar la planilla.</div>
      </div>
    )
  }

  const { asignacion, dimensiones, estudiantes } = data
  const esEspecial     = asignacion.materia.es_especial
  const totalIndicCols = dimensiones.reduce((n, d) => n + d.indicadores.length, 0)
  const colSpanVacio   = 2 + totalIndicCols + dimensiones.length + (esEspecial ? 0 : 3)

  return (
    <div className="space-y-4">
      <BackLink onClick={onBack} label="Volver a materias" />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">
            {asignacion.paralelo.grado.nombre} "{asignacion.paralelo.letra}"
          </p>
          <h1 className="text-2xl font-bold text-fg leading-tight">{asignacion.materia.nombre}</h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-fg-muted">
            <Icon name="graduation-cap" className="h-4 w-4" />
            Prof. {asignacion.docente.apellido}, {asignacion.docente.nombre}
          </p>
        </div>
        {asignacion.gestion.trimestres.length > 0 && (
          <select
            value={trimestreId}
            onChange={e => setTrimestreId(e.target.value)}
            className="rounded-lg border border-border px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand"
          >
            {asignacion.gestion.trimestres.map(t => (
              <option key={t.id} value={t.id}>
                {trimestreLabel(t.numero)}{t.cerrado ? ' (cerrado)' : ''}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-border shadow-sm">
        <table className="min-w-max text-sm border-collapse">
          <thead>
            <tr>
              <th rowSpan={2} className="sticky left-0 z-20 w-10 bg-surface-2 px-2 py-2 text-center text-xs font-semibold text-fg-muted border-b border-r border-border">N°</th>
              <th rowSpan={2} className="sticky left-10 z-20 w-52 bg-surface-2 px-4 py-2 text-left text-xs font-semibold text-fg-muted border-b border-r border-border whitespace-nowrap">Apellidos y Nombres</th>
              {dimensiones.map((dim, idx) => (
                <th
                  key={dim.id}
                  colSpan={dim.indicadores.length + 1}
                  className={`${DIM_HEADER_BG[idx] ?? 'bg-gray-600'} text-white px-2 py-1.5 text-center text-xs font-bold uppercase tracking-wider border-b border-r border-white/20`}
                >
                  {dim.nombre} <span className="font-normal opacity-75">/ {dim.puntaje_max} pts</span>
                </th>
              ))}
              {!esEspecial && (
                <>
                  <th rowSpan={2} className="bg-indigo-900 dark:bg-indigo-950 text-white px-2 py-2 text-center text-[10px] font-bold uppercase border-b border-slate-700 whitespace-nowrap">Nota<br />Extracurricular</th>
                  <th rowSpan={2} className="bg-slate-800 dark:bg-slate-900 text-white px-3 py-2 text-center text-xs font-bold uppercase border-b border-slate-700 whitespace-nowrap">TOTAL</th>
                  <th rowSpan={2} className="bg-slate-800 dark:bg-slate-900 text-white px-3 py-2 text-center text-xs font-bold uppercase border-b border-slate-700">ESCALA</th>
                </>
              )}
            </tr>
            <tr>
              {dimensiones.map((dim, idx) => (
                <Fragment key={dim.id}>
                  {dim.indicadores.map(ind => (
                    <th key={ind.id} className={`${DIM_CELL_BG[idx] ?? 'bg-bg'} border-r border-border px-2 py-1.5 text-center align-bottom`} style={{ minWidth: '5.5rem' }}>
                      <div className="text-fg text-xs font-medium leading-tight" title={ind.nombre}>{ind.nombre}</div>
                      <div className="text-fg-muted leading-tight mt-0.5" style={{ fontSize: '0.65rem' }}>
                        {ind.instrumento === 'OTRO' && ind.instrumento_otro ? ind.instrumento_otro : (INSTRUMENTO_LABELS[ind.instrumento] ?? ind.instrumento)}
                      </div>
                      <div className="text-fg-muted leading-tight" style={{ fontSize: '0.65rem' }}>
                        {ind.fecha_aplicacion ? ind.fecha_aplicacion.slice(0, 10) : ''}
                      </div>
                    </th>
                  ))}
                  <th className={`${DIM_PROM_BG[idx] ?? 'bg-surface-2'} ${DIM_PROM_TEXT[idx] ?? 'text-fg'} border-r border-border px-2 py-1 text-center text-xs font-bold whitespace-nowrap`}>PROM.</th>
                </Fragment>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {estudiantes.length === 0 && (
              <tr><td colSpan={colSpanVacio} className="py-10 text-center text-fg-muted">No hay estudiantes matriculados en este paralelo.</td></tr>
            )}
            {estudiantes.map((est, rowIdx) => (
              <tr key={est.id} className="hover:bg-surface-2/60 transition-colors">
                <td className="sticky left-0 z-10 bg-surface w-10 px-2 py-2 text-center text-xs text-fg-muted border-r border-border">{rowIdx + 1}</td>
                <td className="sticky left-10 z-10 bg-surface w-52 px-4 py-2 border-r border-border whitespace-nowrap">
                  <span className="font-medium text-fg">{est.apellido},</span> <span className="text-fg-muted">{est.nombre}</span>
                </td>
                {dimensiones.map((dim, idx) => (
                  <Fragment key={dim.id}>
                    {dim.indicadores.map(ind => (
                      <td key={ind.id} className={`${DIM_CELL_BG[idx] ?? 'bg-bg'} border-r border-border px-2 py-2 text-center`}>
                        {est.notas[ind.id] != null ? est.notas[ind.id] : <span className="text-fg-muted/40">—</span>}
                      </td>
                    ))}
                    <td className={`${DIM_PROM_BG[idx] ?? 'bg-surface-2'} ${DIM_PROM_TEXT[idx] ?? 'text-fg'} border-r border-border px-3 py-2 text-center text-sm font-bold`}>
                      {est.promedios[dim.id] != null ? est.promedios[dim.id] : <span className="text-fg-muted/50">—</span>}
                    </td>
                  </Fragment>
                ))}
                {!esEspecial && (
                  <>
                    <td className="px-2 py-2 text-center text-sm font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50/60 dark:bg-indigo-500/10 border-r border-border">
                      {est.notaExtracurricular != null ? est.notaExtracurricular : <span className="text-fg-muted/50 font-normal">—</span>}
                    </td>
                    <td className={`px-3 py-2 text-center text-sm font-bold border-r border-border ${est.total != null && est.total < 51 ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30' : 'text-fg bg-surface'}`}>
                      {est.total != null ? est.total : <span className="text-fg-muted/50">—</span>}
                    </td>
                    <td className="px-3 py-2 text-center bg-surface">
                      {est.escala
                        ? <span className={`inline-block rounded px-2 py-0.5 text-xs font-bold ${ESCALA_COLORS[est.escala] ?? ''}`}>{est.escala}</span>
                        : <span className="text-fg-muted/50">—</span>}
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-fg-muted text-center">
        Vista de solo lectura — el registro y la edición de notas los hace el/la docente desde su panel.
      </p>
    </div>
  )
}

function BackLink({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1.5 text-sm font-medium text-fg-muted hover:text-fg transition-colors">
      <Icon name="arrow-left" className="h-4 w-4" />
      {label}
    </button>
  )
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function RegistrosPage() {
  const toast     = useToast()
  const toastRef  = useRef(toast)
  toastRef.current = toast
  const [searchParams, setSearchParams] = useSearchParams()
  const { id: gestionActivaId } = useGestionActiva()

  const [vista,             setVista]             = useState<Vista>('cursos')
  const [paralelos,         setParalelos]         = useState<ParaleloCard[]>([])
  const [loadingParalelos,  setLoadingParalelos]  = useState(true)
  const [selectedParalelo,  setSelectedParalelo]  = useState<ParaleloCard | null>(null)

  const [asignaciones,        setAsignaciones]        = useState<AsignacionCard[]>([])
  const [loadingAsignaciones, setLoadingAsignaciones] = useState(false)
  const [selectedAsignacion,  setSelectedAsignacion]  = useState<AsignacionCard | null>(null)

  useEffect(() => {
    api.get<ParaleloCard[]>('/paralelos')
      .then(setParalelos)
      .catch(() => toastRef.current.error('No se pudieron cargar los cursos'))
      .finally(() => setLoadingParalelos(false))
  }, [])

  // Deep-link: restaura curso/materia desde la URL (?paralelo_id=&asignacion_id=)
  useEffect(() => {
    if (paralelos.length === 0) return
    const paraleloId = searchParams.get('paralelo_id')
    if (!paraleloId || selectedParalelo) return
    const match = paralelos.find(p => p.id === paraleloId)
    if (match) { setSelectedParalelo(match); setVista('materias') }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paralelos])

  const cargarAsignaciones = useCallback(async () => {
    if (!selectedParalelo) return
    setLoadingAsignaciones(true)
    try {
      const qs = new URLSearchParams({ paralelo_id: selectedParalelo.id })
      if (gestionActivaId) qs.set('gestion_id', gestionActivaId)
      setAsignaciones(await api.get<AsignacionCard[]>(`/asignaciones?${qs}`))
    } catch {
      toastRef.current.error('No se pudieron cargar las materias')
    } finally {
      setLoadingAsignaciones(false)
    }
  }, [selectedParalelo, gestionActivaId])

  useEffect(() => { if (vista === 'materias') cargarAsignaciones() }, [cargarAsignaciones, vista])

  useEffect(() => {
    if (asignaciones.length === 0) return
    const asignacionId = searchParams.get('asignacion_id')
    if (!asignacionId || selectedAsignacion) return
    const match = asignaciones.find(a => a.id === asignacionId)
    if (match) { setSelectedAsignacion(match); setVista('planilla') }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asignaciones])

  function selectCurso(p: ParaleloCard) {
    setSelectedParalelo(p)
    setSelectedAsignacion(null)
    setAsignaciones([])
    setVista('materias')
    setSearchParams({ paralelo_id: p.id }, { replace: true })
  }

  function selectMateria(a: AsignacionCard) {
    setSelectedAsignacion(a)
    setVista('planilla')
    setSearchParams({ paralelo_id: selectedParalelo!.id, asignacion_id: a.id }, { replace: true })
  }

  function backToCursos() {
    setVista('cursos')
    setSelectedParalelo(null)
    setSelectedAsignacion(null)
    setAsignaciones([])
    setSearchParams({}, { replace: true })
  }

  function backToMaterias() {
    setVista('materias')
    setSelectedAsignacion(null)
    setSearchParams({ paralelo_id: selectedParalelo!.id }, { replace: true })
  }

  // ── VISTA: Grilla de cursos ────────────────────────────────────────────────

  if (vista === 'cursos') {
    const byNivel: Record<string, ParaleloCard[]> = {}
    for (const p of paralelos) {
      const n = p.grado?.nivel?.nombre
      if (!n) continue
      ;(byNivel[n] ??= []).push(p)
    }
    const nivelOrder = ['INICIAL', 'PRIMARIA', 'SECUNDARIA']
    const niveles = nivelOrder.filter(n => byNivel[n])

    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-fg">Registros</h1>
          <p className="text-sm text-fg-muted mt-0.5">Selecciona un curso para ver sus materias y planillas</p>
        </div>

        {loadingParalelos ? (
          <div className="flex justify-center py-20"><Spinner /></div>
        ) : (
          <div className="space-y-8">
            {niveles.map(nivelNombre => {
              const style = NIVEL_STYLES[nivelNombre] ?? NIVEL_FALLBACK
              const cards = byNivel[nivelNombre]!.sort((a, b) => {
                const numA = parseInt(a.grado?.nombre?.match(/\d+/)?.[0] ?? '0')
                const numB = parseInt(b.grado?.nombre?.match(/\d+/)?.[0] ?? '0')
                return numA !== numB ? numA - numB : a.letra.localeCompare(b.letra)
              })
              return (
                <div key={nivelNombre}>
                  <div className="flex items-center gap-3 mb-4">
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${style.badge}`}>
                      {style.label || nivelNombre}
                    </span>
                    <div className="h-px flex-1 bg-surface-2" />
                    <span className="text-xs text-fg-muted">{cards.length} paralelos</span>
                  </div>
                  <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))' }}>
                    {cards.map(p => (
                      <button
                        key={p.id}
                        onClick={() => selectCurso(p)}
                        className={`flex flex-col items-center justify-center rounded-xl border-2 h-20 text-center transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md ${style.bg} ${style.border} ${style.hover}`}
                      >
                        <p className={`text-base font-extrabold leading-tight px-1 ${style.num}`}>
                          {abbreviateGrado(p.grado?.nombre ?? '', p.letra)}
                        </p>
                        <p className="mt-1 text-[10px] font-medium text-fg-muted uppercase tracking-wide">
                          {style.label || nivelNombre}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ── VISTA: Grilla de materias del curso ────────────────────────────────────

  if (vista === 'materias') {
    const style = NIVEL_STYLES[selectedParalelo?.grado.nivel.nombre ?? ''] ?? NIVEL_FALLBACK
    return (
      <div className="space-y-6">
        <BackLink onClick={backToCursos} label="Volver a cursos" />

        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${style.badge}`}>
            {selectedParalelo ? abbreviateGrado(selectedParalelo.grado.nombre, selectedParalelo.letra) : ''}
          </span>
          <div>
            <h1 className="text-2xl font-bold text-fg leading-tight">Materias del curso</h1>
            <p className="text-sm text-fg-muted mt-0.5">Selecciona una materia para ver su planilla de calificaciones</p>
          </div>
        </div>

        {loadingAsignaciones ? (
          <div className="flex justify-center py-20"><Spinner /></div>
        ) : asignaciones.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-border bg-surface p-12 text-center text-sm text-fg-muted">
            Este curso no tiene materias asignadas en la gestión activa.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {asignaciones.map(a => (
              <button
                key={a.id}
                onClick={() => selectMateria(a)}
                className="flex flex-col items-start gap-1 rounded-xl border border-border bg-surface p-5 text-left shadow-sm hover:shadow-md hover:border-brand transition-all"
              >
                <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">{a.materia.campo.nombre}</p>
                <h2 className="text-lg font-bold text-fg leading-tight">{a.materia.nombre}</h2>
                {a.materia.es_subarea_de_id && (
                  <p className="text-xs text-fg-muted">Subárea de {a.materia.parent_materia?.nombre ?? '—'}</p>
                )}
                <div className="mt-2 flex items-center gap-1.5 text-sm text-fg-muted">
                  <Icon name="graduation-cap" className="h-4 w-4" />
                  Prof. {a.docente.usuario.apellido}, {a.docente.usuario.nombre}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ── VISTA: Planilla de solo lectura ────────────────────────────────────────

  return <PlanillaLectura asignacionId={selectedAsignacion!.id} onBack={backToMaterias} />
}
