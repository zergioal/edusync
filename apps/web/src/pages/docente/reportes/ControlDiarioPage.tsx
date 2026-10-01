import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api, apiDownload } from '../../../lib/api'
import { useToast } from '../../../components/ui/Toast'
import { SelectMiCurso } from '../../../components/docente/SelectMiCurso'
import { SelectGestion } from '../../../components/select/SelectGestion'
import { SelectTrimestre } from '../../../components/select/SelectTrimestre'
import { Icon } from '../../../components/ui/Icon'
import { Button, Spinner } from '@edusync/ui'

type Vista = 'estudiante' | 'curso'
type ModoEstudiante = 'mes' | 'trimestre' | 'total'
type ModoCurso = 'mes' | 'trimestre' | 'anno'

interface EstudianteCurso { id: string; codigo: string; usuario: { nombre: string; apellido: string } }

interface FilaObservacion {
  fecha:      string
  estudiante?: string
  categoria:  string
  detalle:    string | null
  materia:    string
  docente?:   string
}
interface ReportePorEstudiante { estudiante: string; codigo: string; curso: string; periodo: string; observaciones: FilaObservacion[] }
interface ReportePorCurso { curso: string; periodo: string; observaciones: FilaObservacion[] }

function mesActual() { return new Date().toISOString().slice(0, 7) }

export default function ControlDiarioPage() {
  const toast = useToast()
  const [paraleloId, setParaleloId] = useState('')
  const [vista,       setVista]     = useState<Vista>('estudiante')

  // ── Por estudiante ──────────────────────────────────────────────────────
  const [estudiantes,    setEstudiantes]    = useState<EstudianteCurso[]>([])
  const [loadingEst,     setLoadingEst]     = useState(false)
  const [buscar,         setBuscar]         = useState('')
  const [estudianteId,   setEstudianteId]   = useState('')
  const [modoEst,        setModoEst]        = useState<ModoEstudiante>('total')
  const [mesEst,         setMesEst]         = useState(mesActual())
  const [gestionEstId,   setGestionEstId]   = useState('')
  const [trimestreEstId, setTrimestreEstId] = useState('')
  const [dataEst,        setDataEst]        = useState<ReportePorEstudiante | null>(null)

  // ── Todo el curso ───────────────────────────────────────────────────────
  const [alcance,      setAlcance]      = useState<'propio' | 'todos'>('propio')
  const [modoCurso,    setModoCurso]    = useState<ModoCurso>('mes')
  const [mesCurso,     setMesCurso]     = useState(mesActual())
  const [gestionId,    setGestionId]    = useState('')
  const [trimestreId,  setTrimestreId]  = useState('')
  const [dataCurso,    setDataCurso]    = useState<ReportePorCurso | null>(null)

  const [loading,     setLoading]     = useState(false)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    setEstudianteId(''); setBuscar(''); setDataEst(null); setDataCurso(null)
    if (!paraleloId) { setEstudiantes([]); return }
    setLoadingEst(true)
    api.get<EstudianteCurso[]>(`/estudiantes?paralelo_id=${paraleloId}`)
      .then(setEstudiantes)
      .catch(() => toast.error('No se pudieron cargar los estudiantes del curso'))
      .finally(() => setLoadingEst(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paraleloId])

  // Al elegir un estudiante, genera el reporte de una vez con el período por
  // defecto (Total) en vez de esperar un segundo clic en "Generar reporte".
  useEffect(() => {
    if (!estudianteId) return
    generarEst()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estudianteId])

  const estudiantesFiltrados = buscar.trim()
    ? estudiantes.filter(e => `${e.usuario.apellido} ${e.usuario.nombre}`.toLowerCase().includes(buscar.trim().toLowerCase()))
    : estudiantes

  const listoEst = !!estudianteId && (modoEst === 'mes' ? !!mesEst : modoEst === 'trimestre' ? !!trimestreEstId : true)
  const listoCurso = !!paraleloId && (modoCurso === 'mes' ? !!mesCurso : modoCurso === 'trimestre' ? !!trimestreId : !!gestionId)

  function queryParamsEst() {
    const p = new URLSearchParams({ modo: modoEst })
    if (modoEst === 'mes') p.set('mes', mesEst)
    if (modoEst === 'trimestre') p.set('trimestre_id', trimestreEstId)
    return p.toString()
  }

  function queryParamsCurso() {
    const p = new URLSearchParams({ paralelo_id: paraleloId, modo: modoCurso, alcance })
    if (modoCurso === 'mes') p.set('mes', mesCurso)
    if (modoCurso === 'trimestre') p.set('trimestre_id', trimestreId)
    if (modoCurso === 'anno') p.set('gestion_id', gestionId)
    return p.toString()
  }

  async function generarEst() {
    if (!listoEst) return
    setLoading(true)
    try {
      setDataEst(await api.get<ReportePorEstudiante>(`/observaciones-diarias/mi-estudiante/${estudianteId}/reporte?${queryParamsEst()}`))
    } catch {
      toast.error('No se pudo generar el reporte')
    } finally {
      setLoading(false)
    }
  }

  async function descargarEst() {
    if (!listoEst) return
    setDownloading(true)
    try {
      await apiDownload(`/observaciones-diarias/mi-estudiante/${estudianteId}/reporte/pdf?${queryParamsEst()}`, 'control_diario.pdf')
    } catch {
      toast.error('Error al generar el PDF')
    } finally {
      setDownloading(false)
    }
  }

  async function generarCurso() {
    if (!listoCurso) return
    setLoading(true)
    try {
      setDataCurso(await api.get<ReportePorCurso>(`/observaciones-diarias/mi-reporte?${queryParamsCurso()}`))
    } catch {
      toast.error('No se pudo generar el reporte')
    } finally {
      setLoading(false)
    }
  }

  async function descargarCurso() {
    if (!listoCurso) return
    setDownloading(true)
    try {
      await apiDownload(`/observaciones-diarias/mi-reporte/pdf?${queryParamsCurso()}`, 'control_diario.pdf')
    } catch {
      toast.error('Error al generar el PDF')
    } finally {
      setDownloading(false)
    }
  }

  const data = vista === 'estudiante' ? dataEst : dataCurso

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Link to=".." className="text-sm font-medium text-fg-muted hover:text-fg transition-colors flex items-center gap-1">
          <Icon name="arrow-left" className="h-4 w-4" /> Reportes
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-fg">Control Diario</h1>
        <p className="text-sm text-fg-muted mt-0.5">Genera el reporte de un estudiante puntual o de todo el curso.</p>
      </div>

      <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectMiCurso value={paraleloId} onChange={setParaleloId} />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-fg">Reporte</label>
            <div className="flex rounded-lg border border-border overflow-hidden">
              {(['estudiante', 'curso'] as Vista[]).map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => { setVista(v); setDataEst(null); setDataCurso(null) }}
                  className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                    vista === v ? 'bg-indigo-600 text-white' : 'bg-surface hover:bg-surface-2 text-fg'
                  }`}
                >
                  {v === 'estudiante' ? 'Por estudiante' : 'Todo el curso'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {!paraleloId && (
          <p className="text-sm text-fg-muted">Selecciona un curso para continuar.</p>
        )}

        {paraleloId && vista === 'estudiante' && (
          <div className="space-y-4 border-t border-border pt-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-fg">Buscar estudiante</label>
                <input
                  type="text"
                  value={buscar}
                  onChange={e => setBuscar(e.target.value)}
                  placeholder="Nombre o apellido…"
                  className="rounded-lg border border-border px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-fg">Estudiante del curso</label>
                <select
                  value={estudianteId}
                  onChange={e => { setEstudianteId(e.target.value); setDataEst(null) }}
                  disabled={loadingEst}
                  className="rounded-lg border border-border px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand disabled:bg-bg disabled:text-fg-muted"
                >
                  <option value="">{loadingEst ? 'Cargando…' : '— Seleccionar —'}</option>
                  {estudiantesFiltrados.map(e => (
                    <option key={e.id} value={e.id}>{e.usuario.apellido}, {e.usuario.nombre}</option>
                  ))}
                </select>
              </div>
            </div>

            {estudianteId && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-fg">Período</label>
                  <div className="flex rounded-lg border border-border overflow-hidden">
                    {(['mes', 'trimestre', 'total'] as ModoEstudiante[]).map(m => (
                      <button key={m} type="button" onClick={() => { setModoEst(m); setDataEst(null) }}
                        className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                          modoEst === m ? 'bg-indigo-600 text-white' : 'bg-surface hover:bg-surface-2 text-fg'
                        }`}>
                        {m === 'mes' ? 'Mensual' : m === 'trimestre' ? 'Trimestral' : 'Total'}
                      </button>
                    ))}
                  </div>
                </div>
                {modoEst === 'mes' && (
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-fg">Mes</label>
                    <input type="month" value={mesEst} max={mesActual()} onChange={e => setMesEst(e.target.value)}
                      className="rounded-lg border border-border px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand" />
                  </div>
                )}
                {modoEst === 'trimestre' && (
                  <div className="grid grid-cols-2 gap-2 sm:col-span-2">
                    <SelectGestion   value={gestionEstId}   onChange={id => { setGestionEstId(id); setTrimestreEstId('') }} />
                    <SelectTrimestre value={trimestreEstId} onChange={setTrimestreEstId} gestionId={gestionEstId} />
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={generarEst} disabled={!listoEst || loading} loading={loading}>Generar reporte</Button>
              {dataEst && (
                <button type="button" onClick={descargarEst} disabled={downloading}
                  className="group inline-flex items-center gap-1.5 rounded-lg border border-blue-600/60 px-3 py-1.5 text-sm font-medium text-blue-700 dark:text-blue-400 transition-colors duration-150 hover:bg-blue-50 dark:hover:bg-blue-950/30 disabled:opacity-50">
                  <Icon name="file-pdf" className="h-4 w-4" />
                  {downloading ? 'Generando…' : 'Descargar PDF'}
                </button>
              )}
            </div>
          </div>
        )}

        {paraleloId && vista === 'curso' && (
          <div className="space-y-4 border-t border-border pt-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-fg">Alcance</label>
                <div className="flex rounded-lg border border-border overflow-hidden">
                  {(['propio', 'todos'] as const).map(a => (
                    <button key={a} type="button" onClick={() => { setAlcance(a); setDataCurso(null) }}
                      className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                        alcance === a ? 'bg-indigo-600 text-white' : 'bg-surface hover:bg-surface-2 text-fg'
                      }`}>
                      {a === 'propio' ? 'Mi materia' : 'Todos los docentes'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-fg">Período</label>
                <div className="flex rounded-lg border border-border overflow-hidden">
                  {(['mes', 'trimestre', 'anno'] as ModoCurso[]).map(m => (
                    <button key={m} type="button" onClick={() => { setModoCurso(m); setDataCurso(null) }}
                      className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                        modoCurso === m ? 'bg-indigo-600 text-white' : 'bg-surface hover:bg-surface-2 text-fg'
                      }`}>
                      {m === 'mes' ? 'Mensual' : m === 'trimestre' ? 'Trimestral' : 'Gestión'}
                    </button>
                  ))}
                </div>
              </div>
              {modoCurso === 'mes' && (
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-fg">Mes</label>
                  <input type="month" value={mesCurso} max={mesActual()} onChange={e => setMesCurso(e.target.value)}
                    className="rounded-lg border border-border px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand" />
                </div>
              )}
              {modoCurso === 'trimestre' && (
                <div className="grid grid-cols-2 gap-2">
                  <SelectGestion   value={gestionId}   onChange={id => { setGestionId(id); setTrimestreId('') }} />
                  <SelectTrimestre value={trimestreId} onChange={setTrimestreId} gestionId={gestionId} />
                </div>
              )}
              {modoCurso === 'anno' && (
                <SelectGestion value={gestionId} onChange={setGestionId} />
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={generarCurso} disabled={!listoCurso || loading} loading={loading}>Generar reporte</Button>
              {dataCurso && (
                <button type="button" onClick={descargarCurso} disabled={downloading}
                  className="group inline-flex items-center gap-1.5 rounded-lg border border-blue-600/60 px-3 py-1.5 text-sm font-medium text-blue-700 dark:text-blue-400 transition-colors duration-150 hover:bg-blue-50 dark:hover:bg-blue-950/30 disabled:opacity-50">
                  <Icon name="file-pdf" className="h-4 w-4" />
                  {downloading ? 'Generando…' : 'Descargar PDF'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {loading && <div className="flex justify-center py-12"><Spinner /></div>}

      {data && !loading && (
        <div className="rounded-xl border border-border bg-surface shadow-sm overflow-x-auto">
          <div className="px-5 py-3 border-b border-border">
            <span className="text-sm font-semibold text-fg">
              {vista === 'estudiante' && dataEst ? `${dataEst.estudiante} · ` : ''}
              {data.curso} · {data.periodo} · {data.observaciones.length} observación{data.observaciones.length !== 1 ? 'es' : ''}
            </span>
          </div>
          {data.observaciones.length === 0 ? (
            <div className="py-12 text-center text-sm text-fg-muted">Sin observaciones registradas en este período.</div>
          ) : (
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="bg-bg text-left text-xs font-semibold uppercase tracking-wide text-fg-muted border-b border-border">
                  <th className="px-4 py-3">Fecha</th>
                  {vista === 'curso' && <th className="px-4 py-3">Estudiante</th>}
                  <th className="px-4 py-3">Materia</th>
                  <th className="px-4 py-3">Observación</th>
                  <th className="px-4 py-3">Detalle</th>
                  {vista === 'curso' && alcance === 'todos' && <th className="px-4 py-3">Docente</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.observaciones.map((o, i) => (
                  <tr key={i} className="hover:bg-surface-2">
                    <td className="px-4 py-2.5 whitespace-nowrap text-fg-muted">{o.fecha}</td>
                    {vista === 'curso' && <td className="px-4 py-2.5 font-medium text-fg whitespace-nowrap">{o.estudiante}</td>}
                    <td className="px-4 py-2.5 text-fg-muted whitespace-nowrap">{o.materia}</td>
                    <td className="px-4 py-2.5">{o.categoria}</td>
                    <td className="px-4 py-2.5 text-fg-muted">{o.detalle ?? '—'}</td>
                    {vista === 'curso' && alcance === 'todos' && <td className="px-4 py-2.5 text-fg-muted whitespace-nowrap">{o.docente}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
