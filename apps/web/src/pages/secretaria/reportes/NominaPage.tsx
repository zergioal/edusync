import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api, apiDownload } from '../../../lib/api'
import { SelectGestion } from '../../../components/select/SelectGestion'
import { SelectNivel }   from '../../../components/select/SelectNivel'
import { SelectGrado }   from '../../../components/select/SelectGrado'
import { SelectParalelo } from '../../../components/select/SelectParalelo'

interface EstRow {
  codigo: string; nombre: string; apellido: string; email: string
  nivel: string; grado: string; paralelo: string; estado: string
}
interface Data { anno: number; estudiantes: EstRow[] }

const ESTADO_BADGE: Record<string, string> = {
  ACTIVO:     'bg-emerald-100 text-emerald-700',
  RETIRADO:   'bg-rose-100 text-rose-700',
  TRASLADADO: 'bg-amber-100 text-amber-700',
}

export default function NominaPage() {
  const [gestionId,  setGestionId]  = useState('')
  const [nivelId,    setNivelId]    = useState('')
  const [gradoId,    setGradoId]    = useState('')
  const [paraleloId, setParaleloId] = useState('')
  const [data,        setData]        = useState<Data | null>(null)
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [dlState,     setDlState]     = useState<'idle' | 'pdf' | 'xlsx'>('idle')

  function qs() {
    const p = new URLSearchParams({ gestion_id: gestionId })
    if (nivelId)    p.set('nivel_id', nivelId)
    if (gradoId)    p.set('grado_id', gradoId)
    if (paraleloId) p.set('paralelo_id', paraleloId)
    return p.toString()
  }

  async function generar() {
    if (!gestionId) return
    setLoading(true); setError(null)
    try {
      setData(await api.get<Data>(`/reportes/nomina?${qs()}`))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar')
    } finally { setLoading(false) }
  }

  async function descargar(tipo: 'pdf' | 'xlsx') {
    if (!gestionId || !data) return
    setDlState(tipo)
    try {
      await apiDownload(`/reportes/nomina/${tipo}?${qs()}`, `nomina_estudiantes.${tipo === 'pdf' ? 'pdf' : 'xlsx'}`)
    } finally { setDlState('idle') }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link to=".." className="text-sm text-blue-600 hover:underline">← Reportes</Link>
        <h1 className="text-xl font-bold text-fg">🧾 Nómina de Estudiantes Inscritos</h1>
      </div>

      <div className="rounded-xl border border-border bg-surface p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <SelectGestion value={gestionId} onChange={id => { setGestionId(id); setData(null) }} />
          <SelectNivel   value={nivelId}   onChange={id => { setNivelId(id); setGradoId(''); setParaleloId('') }} required={false} />
          <SelectGrado   value={gradoId}   onChange={id => { setGradoId(id); setParaleloId('') }} nivelId={nivelId} />
          <SelectParalelo value={paraleloId} onChange={setParaleloId} gradoId={gradoId} placeholder="— Todos —" />
        </div>
        <div className="mt-4">
          <button
            onClick={generar}
            disabled={!gestionId || loading}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Generando…' : 'Generar nómina'}
          </button>
        </div>
      </div>

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {data && (
        <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="font-semibold text-fg">Gestión {data.anno} · {data.estudiantes.length} estudiante(s)</div>
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
                  <th className="px-3 py-2 text-left">Código</th>
                  <th className="px-3 py-2 text-left">Apellido</th>
                  <th className="px-3 py-2 text-left">Nombre</th>
                  <th className="px-3 py-2 text-left">Nivel</th>
                  <th className="px-3 py-2 text-left">Grado</th>
                  <th className="px-3 py-2 text-center">Paralelo</th>
                  <th className="px-3 py-2 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.estudiantes.map(e => (
                  <tr key={e.codigo} className="hover:bg-surface-2">
                    <td className="px-3 py-2 font-mono text-xs">{e.codigo}</td>
                    <td className="px-3 py-2">{e.apellido}</td>
                    <td className="px-3 py-2">{e.nombre}</td>
                    <td className="px-3 py-2">{e.nivel}</td>
                    <td className="px-3 py-2">{e.grado}</td>
                    <td className="px-3 py-2 text-center">{e.paralelo}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ESTADO_BADGE[e.estado] ?? 'bg-surface-2 text-fg-muted'}`}>
                        {e.estado}
                      </span>
                    </td>
                  </tr>
                ))}
                {data.estudiantes.length === 0 && (
                  <tr><td colSpan={7} className="px-3 py-8 text-center text-fg-muted">Sin estudiantes para los filtros seleccionados.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
