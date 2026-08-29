import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api, apiDownload } from '../../../lib/api'
import { SelectGestion }   from '../../../components/select/SelectGestion'
import { SelectTrimestre } from '../../../components/select/SelectTrimestre'
import { SelectParalelo }  from '../../../components/select/SelectParalelo'

type Modo = 'mes' | 'trimestre' | 'anno'

interface FilaObservacion {
  fecha:      string
  estudiante: string
  categoria:  string
  detalle:    string | null
  materia:    string
  docente:    string
}
interface Resultado { curso: string; periodo: string; observaciones: FilaObservacion[] }

function mesActual() { return new Date().toISOString().slice(0, 7) }

export default function ControlDiarioReportePage() {
  const [paraleloId,  setParaleloId]  = useState('')
  const [modo,        setModo]        = useState<Modo>('mes')
  const [mes,         setMes]         = useState(mesActual())
  const [gestionId,   setGestionId]   = useState('')
  const [trimestreId, setTrimestreId] = useState('')
  const [data,        setData]        = useState<Resultado | null>(null)
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)

  const listo = paraleloId && (
    (modo === 'mes' && mes) ||
    (modo === 'trimestre' && trimestreId) ||
    (modo === 'anno' && gestionId)
  )

  function queryParams() {
    const p = new URLSearchParams({ paralelo_id: paraleloId, modo })
    if (modo === 'mes') p.set('mes', mes)
    if (modo === 'trimestre') p.set('trimestre_id', trimestreId)
    if (modo === 'anno') p.set('gestion_id', gestionId)
    return p.toString()
  }

  async function generar() {
    if (!listo) return
    setLoading(true); setError(null)
    try {
      const res = await api.get<Resultado>(`/observaciones-diarias/reporte?${queryParams()}`)
      setData(res)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar')
    } finally {
      setLoading(false)
    }
  }

  async function descargarPdf() {
    if (!listo || !data) return
    setDownloading(true)
    try {
      await apiDownload(`/observaciones-diarias/reporte/pdf?${queryParams()}`, 'control_diario.pdf')
    } finally { setDownloading(false) }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link to=".." className="text-sm text-blue-600 hover:underline">← Reportes</Link>
        <h1 className="text-xl font-bold text-fg">📓 Control Diario</h1>
      </div>

      <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SelectParalelo value={paraleloId} onChange={setParaleloId} label="Curso" />

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-fg">Período</label>
            <div className="flex rounded-lg border border-border overflow-hidden">
              {(['mes', 'trimestre', 'anno'] as Modo[]).map(m => (
                <button
                  key={m}
                  onClick={() => { setModo(m); setData(null) }}
                  className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                    modo === m ? 'bg-blue-600 text-white' : 'bg-surface hover:bg-surface-2 text-fg'
                  }`}
                >
                  {m === 'mes' ? 'Mes' : m === 'trimestre' ? 'Trimestre' : 'Año'}
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

        <button
          onClick={generar}
          disabled={!listo || loading}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Generando…' : 'Generar'}
        </button>
      </div>

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {data && (
        <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="font-semibold text-fg">{data.curso}</div>
              <div className="text-sm text-fg-muted">{data.periodo} · {data.observaciones.length} observaciones</div>
            </div>
            <button
              onClick={descargarPdf}
              disabled={downloading || data.observaciones.length === 0}
              className="rounded-lg border border-blue-600 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50"
            >
              {downloading ? 'Descargando…' : '📄 Descargar PDF'}
            </button>
          </div>

          {data.observaciones.length === 0 ? (
            <div className="py-10 text-center text-sm text-fg-muted">Sin observaciones registradas en este período.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-[#1F3864] text-white">
                    <th className="px-3 py-2 text-left">Fecha</th>
                    <th className="px-3 py-2 text-left">Estudiante</th>
                    <th className="px-3 py-2 text-left">Materia</th>
                    <th className="px-3 py-2 text-left">Observación</th>
                    <th className="px-3 py-2 text-left">Detalle</th>
                    <th className="px-3 py-2 text-left">Docente</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.observaciones.map((o, i) => (
                    <tr key={i} className="hover:bg-surface-2">
                      <td className="px-3 py-2 whitespace-nowrap text-fg-muted">{o.fecha}</td>
                      <td className="px-3 py-2 font-medium">{o.estudiante}</td>
                      <td className="px-3 py-2 text-fg-muted">{o.materia}</td>
                      <td className="px-3 py-2">{o.categoria}</td>
                      <td className="px-3 py-2 text-fg-muted">{o.detalle ?? '—'}</td>
                      <td className="px-3 py-2 text-fg-muted">{o.docente}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
