import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api, apiDownload } from '../../../lib/api'

interface Certificado {
  id: string; tipo: string; fecha_emision: string
  estudiante: string; codigo: string; emitido_por: string; observacion: string | null
}

export default function CertificadosReportePage() {
  const [tipos,  setTipos]  = useState<string[]>([])
  const [tipo,   setTipo]   = useState('')
  const [desde,  setDesde]  = useState('')
  const [hasta,  setHasta]  = useState('')
  const [data,    setData]    = useState<Certificado[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [dlState, setDlState] = useState<'idle' | 'pdf' | 'xlsx'>('idle')

  useEffect(() => { api.get<string[]>('/certificados/tipos').then(setTipos).catch(() => {}) }, [])

  function qs() {
    const p = new URLSearchParams()
    if (tipo)  p.set('tipo', tipo)
    if (desde) p.set('desde', desde)
    if (hasta) p.set('hasta', hasta)
    return p.toString()
  }

  async function generar() {
    setLoading(true); setError(null)
    try { setData(await api.get<Certificado[]>(`/certificados/reporte?${qs()}`)) }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Error al cargar') }
    finally { setLoading(false) }
  }

  async function descargar(t: 'pdf' | 'xlsx') {
    if (!data) return
    setDlState(t)
    try { await apiDownload(`/certificados/reporte/${t}?${qs()}`, `certificados_emitidos.${t === 'pdf' ? 'pdf' : 'xlsx'}`) }
    finally { setDlState('idle') }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link to=".." className="text-sm text-blue-600 hover:underline">← Reportes</Link>
        <h1 className="text-xl font-bold text-fg">📜 Certificados y Trámites Realizados</h1>
      </div>

      <div className="rounded-xl border border-border bg-surface p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-fg">Tipo</label>
            <select value={tipo} onChange={e => setTipo(e.target.value)}
              className="rounded-lg border border-border px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand">
              <option value="">— Todos —</option>
              {tipos.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-fg">Desde</label>
            <input type="date" value={desde} onChange={e => setDesde(e.target.value)}
              className="rounded-lg border border-border px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-fg">Hasta</label>
            <input type="date" value={hasta} onChange={e => setHasta(e.target.value)}
              className="rounded-lg border border-border px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand" />
          </div>
          <div className="flex items-end">
            <button onClick={generar} disabled={loading}
              className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Generando…' : 'Generar reporte'}
            </button>
          </div>
        </div>
      </div>

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {data && (
        <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="font-semibold text-fg">{data.length} certificado(s) emitido(s)</div>
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
                  <th className="px-3 py-2 text-left">Fecha</th>
                  <th className="px-3 py-2 text-left">Tipo</th>
                  <th className="px-3 py-2 text-left">Estudiante</th>
                  <th className="px-3 py-2 text-left">Código</th>
                  <th className="px-3 py-2 text-left">Emitido por</th>
                  <th className="px-3 py-2 text-left">Observación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.map(c => (
                  <tr key={c.id} className="hover:bg-surface-2">
                    <td className="px-3 py-2 text-fg-muted">{new Date(c.fecha_emision).toLocaleDateString('es-BO')}</td>
                    <td className="px-3 py-2 font-medium">{c.tipo}</td>
                    <td className="px-3 py-2">{c.estudiante}</td>
                    <td className="px-3 py-2 font-mono text-xs">{c.codigo}</td>
                    <td className="px-3 py-2 text-fg-muted">{c.emitido_por}</td>
                    <td className="px-3 py-2 text-fg-muted">{c.observacion ?? '—'}</td>
                  </tr>
                ))}
                {data.length === 0 && (
                  <tr><td colSpan={6} className="px-3 py-8 text-center text-fg-muted">Sin certificados para los filtros seleccionados.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
