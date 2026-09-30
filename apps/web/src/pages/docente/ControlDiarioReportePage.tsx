import { useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { api, apiDownload } from '../../lib/api'
import { useToast } from '../../components/ui/Toast'
import { BackButton } from '../../components/ui/BackButton'
import { Icon } from '../../components/ui/Icon'
import { SelectGestion } from '../../components/select/SelectGestion'
import { SelectTrimestre } from '../../components/select/SelectTrimestre'
import { Spinner, Button } from '@edusync/ui'

type Modo = 'mes' | 'trimestre' | 'anno'
type Alcance = 'propio' | 'todos'

interface ReporteRow {
  fecha:      string
  estudiante: string
  categoria:  string
  detalle:    string | null
  materia:    string
  docente:    string
}
interface ReporteData { curso: string; periodo: string; observaciones: ReporteRow[] }

function mesActual() { return new Date().toISOString().slice(0, 7) }

export default function ControlDiarioReportePage() {
  const { paralelo_id } = useParams<{ paralelo_id: string }>()
  const toast    = useToast()
  const toastRef = useRef(toast)
  toastRef.current = toast

  const [modo,        setModo]        = useState<Modo>('mes')
  const [mes,         setMes]         = useState(mesActual())
  const [gestionId,   setGestionId]   = useState('')
  const [trimestreId, setTrimestreId] = useState('')
  const [alcance,     setAlcance]     = useState<Alcance>('propio')
  const [data,        setData]        = useState<ReporteData | null>(null)
  const [loading,     setLoading]     = useState(false)
  const [downloading, setDownloading] = useState(false)

  const listo = modo === 'mes' ? !!mes : modo === 'trimestre' ? !!trimestreId : !!gestionId

  function queryParams() {
    const p = new URLSearchParams({ paralelo_id: paralelo_id!, modo, alcance })
    if (modo === 'mes')       p.set('mes', mes)
    if (modo === 'trimestre') p.set('trimestre_id', trimestreId)
    if (modo === 'anno')      p.set('gestion_id', gestionId)
    return p.toString()
  }

  async function generar() {
    if (!listo) return
    setLoading(true)
    try {
      setData(await api.get<ReporteData>(`/observaciones-diarias/mi-reporte?${queryParams()}`))
    } catch {
      toastRef.current.error('No se pudo generar el reporte')
    } finally {
      setLoading(false)
    }
  }

  async function descargarPdf() {
    if (!listo) return
    setDownloading(true)
    try {
      await apiDownload(`/observaciones-diarias/mi-reporte/pdf?${queryParams()}`, 'control_diario.pdf')
    } catch {
      toastRef.current.error('Error al generar el PDF')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <BackButton className="mb-2" />
        <h1 className="text-2xl font-bold text-fg">Reporte de Control Diario</h1>
        <p className="text-sm text-fg-muted mt-0.5">
          {data ? `${data.curso} · ${data.periodo}` : 'Elige el alcance y el período para generar el reporte.'}
        </p>
      </div>

      <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-fg">Alcance</label>
            <div className="flex rounded-lg border border-border overflow-hidden">
              {(['propio', 'todos'] as Alcance[]).map(a => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAlcance(a)}
                  className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                    alcance === a ? 'bg-indigo-600 text-white' : 'bg-surface hover:bg-surface-2 text-fg'
                  }`}
                >
                  {a === 'propio' ? 'Mi materia' : 'Todos los docentes'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-fg">Período</label>
            <div className="flex rounded-lg border border-border overflow-hidden">
              {(['mes', 'trimestre', 'anno'] as Modo[]).map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setModo(m)}
                  className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                    modo === m ? 'bg-indigo-600 text-white' : 'bg-surface hover:bg-surface-2 text-fg'
                  }`}
                >
                  {m === 'mes' ? 'Mensual' : m === 'trimestre' ? 'Trimestral' : 'Gestión'}
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

          {modo === 'anno' && (
            <SelectGestion value={gestionId} onChange={setGestionId} />
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={generar} disabled={!listo || loading} loading={loading}>Generar reporte</Button>
          <button
            type="button"
            onClick={descargarPdf}
            disabled={!listo || downloading}
            className="group inline-flex items-center gap-1.5 rounded-lg border border-blue-600/60 px-3 py-1.5 text-sm font-medium text-blue-700 dark:text-blue-400 transition-colors duration-150 hover:bg-blue-50 dark:hover:bg-blue-950/30 disabled:opacity-50"
          >
            <Icon name="file-pdf" className="h-4 w-4" />
            {downloading ? 'Generando…' : 'Descargar PDF'}
          </button>
        </div>
      </div>

      {loading && <div className="flex justify-center py-12"><Spinner /></div>}

      {data && !loading && (
        <div className="rounded-xl border border-border bg-surface shadow-sm overflow-x-auto">
          {data.observaciones.length === 0 ? (
            <div className="py-12 text-center text-sm text-fg-muted">Sin observaciones registradas en este período.</div>
          ) : (
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="bg-bg text-left text-xs font-semibold uppercase tracking-wide text-fg-muted border-b border-border">
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Estudiante</th>
                  <th className="px-4 py-3">Materia</th>
                  <th className="px-4 py-3">Observación</th>
                  <th className="px-4 py-3">Detalle</th>
                  {alcance === 'todos' && <th className="px-4 py-3">Docente</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.observaciones.map((o, i) => (
                  <tr key={i} className="hover:bg-surface-2">
                    <td className="px-4 py-2.5 whitespace-nowrap text-fg-muted">
                      {new Date(o.fecha).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-fg whitespace-nowrap">{o.estudiante}</td>
                    <td className="px-4 py-2.5 text-fg-muted whitespace-nowrap">{o.materia}</td>
                    <td className="px-4 py-2.5">{o.categoria}</td>
                    <td className="px-4 py-2.5 text-fg-muted">{o.detalle ?? '—'}</td>
                    {alcance === 'todos' && <td className="px-4 py-2.5 text-fg-muted whitespace-nowrap">{o.docente}</td>}
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
