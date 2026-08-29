import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api, apiDownload } from '../../../lib/api'
import { SelectGestion }  from '../../../components/select/SelectGestion'
import { SelectParalelo } from '../../../components/select/SelectParalelo'

interface Fila {
  estudiante: string; codigo: string; nivel: string; grado: string; paralelo: string
  tutor: string; email: string; telefono: string | null
}

export default function PadresTutoresPage() {
  const [gestionId,  setGestionId]  = useState('')
  const [paraleloId, setParaleloId] = useState('')
  const [filas,       setFilas]       = useState<Fila[] | null>(null)
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [dlState,     setDlState]     = useState<'idle' | 'pdf' | 'xlsx'>('idle')

  function qs() {
    const p = new URLSearchParams({ gestion_id: gestionId })
    if (paraleloId) p.set('paralelo_id', paraleloId)
    return p.toString()
  }

  async function generar() {
    if (!gestionId) return
    setLoading(true); setError(null)
    try { setFilas(await api.get<Fila[]>(`/reportes/padres-tutores?${qs()}`)) }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Error al cargar') }
    finally { setLoading(false) }
  }

  async function descargar(tipo: 'pdf' | 'xlsx') {
    if (!gestionId || !filas) return
    setDlState(tipo)
    try { await apiDownload(`/reportes/padres-tutores/${tipo}?${qs()}`, `padres_tutores.${tipo === 'pdf' ? 'pdf' : 'xlsx'}`) }
    finally { setDlState('idle') }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link to=".." className="text-sm text-blue-600 hover:underline">← Reportes</Link>
        <h1 className="text-xl font-bold text-fg">👨‍👩‍👧 Padres, Madres y Tutores</h1>
      </div>

      <div className="rounded-xl border border-border bg-surface p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SelectGestion  value={gestionId}  onChange={id => { setGestionId(id); setFilas(null) }} />
          <SelectParalelo value={paraleloId} onChange={setParaleloId} placeholder="— Todos —" />
          <div className="flex items-end">
            <button onClick={generar} disabled={!gestionId || loading}
              className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Generando…' : 'Generar reporte'}
            </button>
          </div>
        </div>
      </div>

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {filas && (
        <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="font-semibold text-fg">{filas.length} registro(s)</div>
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
                  <th className="px-3 py-2 text-left">Estudiante</th>
                  <th className="px-3 py-2 text-left">Código</th>
                  <th className="px-3 py-2 text-left">Grado</th>
                  <th className="px-3 py-2 text-center">Paralelo</th>
                  <th className="px-3 py-2 text-left">Tutor</th>
                  <th className="px-3 py-2 text-left">Correo</th>
                  <th className="px-3 py-2 text-left">Teléfono</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filas.map((f, i) => (
                  <tr key={i} className="hover:bg-surface-2">
                    <td className="px-3 py-2">{f.estudiante}</td>
                    <td className="px-3 py-2 font-mono text-xs">{f.codigo}</td>
                    <td className="px-3 py-2">{f.nivel} · {f.grado}</td>
                    <td className="px-3 py-2 text-center">{f.paralelo}</td>
                    <td className="px-3 py-2">{f.tutor}</td>
                    <td className="px-3 py-2">{f.email}</td>
                    <td className="px-3 py-2">{f.telefono ?? '—'}</td>
                  </tr>
                ))}
                {filas.length === 0 && (
                  <tr><td colSpan={7} className="px-3 py-8 text-center text-fg-muted">Sin registros.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
