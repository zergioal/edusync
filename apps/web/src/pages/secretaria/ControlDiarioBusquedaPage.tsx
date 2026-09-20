import { useState, useRef, useEffect, useCallback } from 'react'
import { api, apiDownload } from '../../lib/api'
import { SelectGestion }   from '../../components/select/SelectGestion'
import { SelectTrimestre } from '../../components/select/SelectTrimestre'
import { Icon } from '../../components/ui/Icon'

type Categoria =
  | 'NO_ENTREGO_TAREA' | 'FALTO' | 'SALIO_SIN_PERMISO'
  | 'NO_RINDIO_EVALUACION' | 'CITACION_AGENDA' | 'INDISCIPLINA' | 'NO_TRABAJA_EN_CLASE' | 'OTRO'

interface EstudianteMatch { id: string; codigo: string; usuario: { nombre: string; apellido: string } }

interface Observacion {
  id:        string
  categoria: Categoria
  detalle:   string | null
  fecha:     string
  docente:   { usuario: { nombre: string; apellido: string } }
  paralelo:  { letra: string; grado: { nombre: string } }
  asignacion: { materia: { nombre: string } } | null
}

const CATEGORIA_CFG: Record<Categoria, { label: string; badge: string }> = {
  NO_ENTREGO_TAREA:     { label: 'No entregó tarea',     badge: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' },
  FALTO:                { label: 'Faltó',                badge: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300' },
  SALIO_SIN_PERMISO:    { label: 'Salió sin permiso',    badge: 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300' },
  NO_RINDIO_EVALUACION: { label: 'No rindió evaluación', badge: 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300' },
  CITACION_AGENDA:      { label: 'Citación en agenda',   badge: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' },
  INDISCIPLINA:         { label: 'Indisciplina',         badge: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300' },
  NO_TRABAJA_EN_CLASE:  { label: 'No trabaja en clase',  badge: 'bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300' },
  OTRO:                 { label: 'Observación',          badge: 'bg-surface-2 text-fg-muted' },
}

type Modo = 'mes' | 'trimestre' | 'total'
function mesActual() { return new Date().toISOString().slice(0, 7) }

function fmtFechaHora(s: string) {
  return new Date(s).toLocaleString('es-BO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
function fmtFechaSola(s: string) {
  return new Date(s).toLocaleDateString('es-BO', { weekday: 'long', day: 'numeric', month: 'long' })
}

export default function ControlDiarioBusquedaPage() {
  const [query,       setQuery]       = useState('')
  const [suggestions, setSuggestions] = useState<EstudianteMatch[]>([])
  const [open,        setOpen]        = useState(false)
  const [selected,    setSelected]    = useState<EstudianteMatch | null>(null)
  const [observaciones, setObservaciones] = useState<Observacion[]>([])
  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState('')

  const [modo,        setModo]        = useState<Modo>('mes')
  const [mes,         setMes]         = useState(mesActual())
  const [gestionId,   setGestionId]   = useState('')
  const [trimestreId, setTrimestreId] = useState('')
  const [downloading, setDownloading] = useState(false)

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapRef  = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setSuggestions([]); setOpen(false); return }
    try {
      const data = await api.get<EstudianteMatch[]>(`/estudiantes?buscar=${encodeURIComponent(q)}`)
      setSuggestions(data)
      setOpen(data.length > 0)
    } catch { setSuggestions([]) }
  }, [])

  function handleQueryChange(v: string) {
    setQuery(v)
    setSelected(null)
    setObservaciones([])
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => search(v), 300)
  }

  async function select(est: EstudianteMatch) {
    setSelected(est)
    setQuery(`${est.usuario.apellido}, ${est.usuario.nombre}`)
    setSuggestions([]); setOpen(false)
    setLoading(true); setError('')
    try {
      setObservaciones(await api.get<Observacion[]>(`/observaciones-diarias/estudiante/${est.id}`))
    } catch {
      setError('No se pudo cargar el control diario de este estudiante')
    } finally { setLoading(false) }
  }

  const listoParaPdf = modo === 'mes' ? !!mes : modo === 'trimestre' ? !!trimestreId : true

  function queryParamsPdf() {
    const p = new URLSearchParams({ modo })
    if (modo === 'mes') p.set('mes', mes)
    if (modo === 'trimestre') p.set('trimestre_id', trimestreId)
    return p.toString()
  }

  async function descargarPdf() {
    if (!selected || !listoParaPdf) return
    setDownloading(true)
    try {
      await apiDownload(`/observaciones-diarias/estudiante/${selected.id}/reporte/pdf?${queryParamsPdf()}`, `control_diario_${selected.codigo}.pdf`)
    } finally { setDownloading(false) }
  }

  // Agrupar por fecha (día calendario) — ya viene ordenado desc desde el backend
  const grupos: { fecha: string; items: Observacion[] }[] = []
  for (const o of observaciones) {
    const dia = o.fecha.slice(0, 10)
    const ultimo = grupos[grupos.length - 1]
    if (ultimo && ultimo.fecha === dia) ultimo.items.push(o)
    else grupos.push({ fecha: dia, items: [o] })
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-fg">Control Diario</h1>
        <p className="text-sm text-fg-muted mt-0.5">Busca un estudiante para ver las observaciones registradas por sus docentes.</p>
      </div>

      <div className="rounded-xl border border-border bg-surface p-5">
        <div className="relative max-w-md" ref={wrapRef}>
          <label className="text-sm font-medium text-fg">Buscar estudiante</label>
          <input
            type="text"
            value={query}
            onChange={e => handleQueryChange(e.target.value)}
            placeholder="Nombre o apellido…"
            autoComplete="off"
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand"
          />
          {open && suggestions.length > 0 && (
            <div className="absolute z-50 mt-1 w-full bg-surface rounded-xl border border-border shadow-lg overflow-hidden">
              {suggestions.map(s => (
                <button
                  key={s.id}
                  type="button"
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => select(s)}
                  className="w-full text-left px-3 py-2.5 hover:bg-surface-2 transition-colors border-b border-border last:border-0"
                >
                  <p className="text-sm font-medium text-fg">{s.usuario.apellido}, {s.usuario.nombre}</p>
                  <p className="text-xs text-fg-muted font-mono">{s.codigo}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {loading && <div className="rounded-xl border border-border bg-surface p-8 text-center text-sm text-fg-muted">Cargando…</div>}
      {error && <div className="rounded-lg bg-red-50 dark:bg-red-950/40 p-3 text-sm text-red-700 dark:text-red-400">{error}</div>}

      {selected && !loading && !error && (
        <>
          {/* Generar reporte por período */}
          <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-fg-muted">Generar reporte en PDF</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-fg">Período</label>
                <div className="flex rounded-lg border border-border overflow-hidden">
                  {(['mes', 'trimestre', 'total'] as Modo[]).map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setModo(m)}
                      className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                        modo === m ? 'bg-indigo-600 text-white' : 'bg-surface hover:bg-surface-2 text-fg'
                      }`}
                    >
                      {m === 'mes' ? 'Mensual' : m === 'trimestre' ? 'Trimestral' : 'Total'}
                    </button>
                  ))}
                </div>
              </div>

              {modo === 'mes' && (
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-fg">Mes</label>
                  <input
                    type="month"
                    value={mes}
                    max={mesActual()}
                    onChange={e => setMes(e.target.value)}
                    className="rounded-lg border border-border px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                </div>
              )}

              {modo === 'trimestre' && (
                <div className="grid grid-cols-2 gap-2">
                  <SelectGestion   value={gestionId}   onChange={id => { setGestionId(id); setTrimestreId('') }} />
                  <SelectTrimestre value={trimestreId} onChange={setTrimestreId} gestionId={gestionId} />
                </div>
              )}

              {modo === 'total' && (
                <div className="flex items-end">
                  <p className="text-sm text-fg-muted pb-2">Incluye todo el historial registrado.</p>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={descargarPdf}
              disabled={!listoParaPdf || downloading}
              className="group inline-flex items-center gap-1.5 rounded-lg border border-blue-600/60 px-3 py-1.5 text-sm font-medium text-blue-700 dark:text-blue-400 transition-colors duration-150 hover:bg-blue-50 dark:hover:bg-blue-950/30 disabled:opacity-50"
            >
              <Icon name="file-pdf" className="h-4 w-4" />
              {downloading ? 'Generando…' : 'Descargar PDF'}
            </button>
          </div>

          {/* Historial completo */}
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-fg-muted mb-3">
              Historial completo — {observaciones.length} observación{observaciones.length !== 1 ? 'es' : ''}
            </h2>
            {grupos.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-border bg-surface p-10 text-center text-sm text-fg-muted">
                Sin observaciones registradas.
              </div>
            ) : (
              <div className="space-y-5">
                {grupos.map(g => (
                  <div key={g.fecha}>
                    <h3 className="text-xs font-bold uppercase tracking-wide text-fg-muted mb-2 capitalize">
                      {fmtFechaSola(g.items[0]!.fecha)}
                    </h3>
                    <div className="space-y-2">
                      {g.items.map(o => {
                        const cfg = CATEGORIA_CFG[o.categoria]
                        return (
                          <div key={o.id} className="rounded-xl border border-border bg-surface p-4 shadow-sm">
                            <div className="flex items-start justify-between gap-3 flex-wrap">
                              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.badge}`}>
                                {cfg.label}
                              </span>
                              <span className="text-xs text-fg-muted">
                                {fmtFechaHora(o.fecha)}
                              </span>
                            </div>
                            {o.detalle && <p className="text-sm text-fg mt-2">{o.detalle}</p>}
                            <p className="text-xs text-fg-muted mt-2">
                              {o.paralelo.grado.nombre} "{o.paralelo.letra}"
                              {o.asignacion && <> · {o.asignacion.materia.nombre}</>}
                              {' '}· {o.docente.usuario.nombre} {o.docente.usuario.apellido}
                            </p>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
