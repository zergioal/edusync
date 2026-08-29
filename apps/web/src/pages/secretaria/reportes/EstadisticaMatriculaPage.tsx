import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api, apiDownload } from '../../../lib/api'
import { SelectGestion } from '../../../components/select/SelectGestion'

interface Data {
  anno: number
  total: number
  por_nivel: Array<{ nivel: string; total: number }>
  por_grado_paralelo: Array<{ nivel: string; grado: string; paralelo: string; total: number }>
  por_sexo: Record<string, number>
}

export default function EstadisticaMatriculaPage() {
  const [gestionId, setGestionId] = useState('')
  const [data,       setData]       = useState<Data | null>(null)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [dlState,    setDlState]    = useState<'idle' | 'pdf' | 'xlsx'>('idle')

  async function generar() {
    if (!gestionId) return
    setLoading(true); setError(null)
    try { setData(await api.get<Data>(`/reportes/estadistica-matricula?gestion_id=${gestionId}`)) }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Error al cargar') }
    finally { setLoading(false) }
  }

  async function descargar(tipo: 'pdf' | 'xlsx') {
    if (!gestionId || !data) return
    setDlState(tipo)
    try { await apiDownload(`/reportes/estadistica-matricula/${tipo}?gestion_id=${gestionId}`, `estadistica_matricula.${tipo === 'pdf' ? 'pdf' : 'xlsx'}`) }
    finally { setDlState('idle') }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link to=".." className="text-sm text-blue-600 hover:underline">← Reportes</Link>
        <h1 className="text-xl font-bold text-fg">📈 Estadística de Matrícula</h1>
      </div>

      <div className="rounded-xl border border-border bg-surface p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SelectGestion value={gestionId} onChange={id => { setGestionId(id); setData(null) }} />
          <div className="flex items-end sm:col-span-2">
            <button onClick={generar} disabled={!gestionId || loading}
              className="w-full sm:w-auto rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Generando…' : 'Generar estadística'}
            </button>
          </div>
        </div>
      </div>

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {data && (
        <div className="space-y-4">
          {/* Totales */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl bg-blue-50 border border-blue-200 px-5 py-3 text-center">
              <div className="text-2xl font-bold text-blue-700">{data.total}</div>
              <div className="text-sm text-blue-600">Total matriculados</div>
            </div>
            <div className="rounded-xl bg-sky-50 border border-sky-200 px-5 py-3 text-center">
              <div className="text-2xl font-bold text-sky-700">{data.por_sexo['M'] ?? 0}</div>
              <div className="text-sm text-sky-600">Masculino</div>
            </div>
            <div className="rounded-xl bg-pink-50 border border-pink-200 px-5 py-3 text-center">
              <div className="text-2xl font-bold text-pink-700">{data.por_sexo['F'] ?? 0}</div>
              <div className="text-sm text-pink-600">Femenino</div>
            </div>
            <div className="rounded-xl bg-bg border border-border px-5 py-3 text-center">
              <div className="text-2xl font-bold text-fg">{data.por_sexo['Sin registrar'] ?? 0}</div>
              <div className="text-sm text-fg-muted">Sin registrar</div>
            </div>
          </div>

          {/* Por nivel */}
          <div className="rounded-xl border border-border bg-surface p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-fg-muted mb-3">Por nivel</h2>
            <div className="flex flex-wrap gap-3">
              {data.por_nivel.map(n => (
                <div key={n.nivel} className="rounded-lg bg-bg px-4 py-2 text-center min-w-[110px]">
                  <div className="text-lg font-bold text-fg">{n.total}</div>
                  <div className="text-xs text-fg-muted">{n.nivel}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Por grado/paralelo + export */}
          <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-fg-muted">Por grado y paralelo</h2>
              <div className="flex gap-2">
                <button onClick={() => descargar('pdf')} disabled={dlState !== 'idle'}
                  className="rounded-lg border border-blue-600 px-3 py-1.5 text-sm text-blue-700 hover:bg-blue-50 disabled:opacity-50">
                  {dlState === 'pdf' ? '…' : '📄 PDF'}
                </button>
                <button onClick={() => descargar('xlsx')} disabled={dlState !== 'idle'}
                  className="rounded-lg border border-green-600 px-3 py-1.5 text-sm text-green-700 hover:bg-green-50 disabled:opacity-50">
                  {dlState === 'xlsx' ? '…' : '📗 Excel'}
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-[#1F3864] text-white">
                    <th className="px-3 py-2 text-left">Nivel</th>
                    <th className="px-3 py-2 text-left">Grado</th>
                    <th className="px-3 py-2 text-center">Paralelo</th>
                    <th className="px-3 py-2 text-center">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.por_grado_paralelo.map((r, i) => (
                    <tr key={i} className="hover:bg-surface-2">
                      <td className="px-3 py-2">{r.nivel}</td>
                      <td className="px-3 py-2">{r.grado}</td>
                      <td className="px-3 py-2 text-center">{r.paralelo}</td>
                      <td className="px-3 py-2 text-center font-semibold">{r.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
