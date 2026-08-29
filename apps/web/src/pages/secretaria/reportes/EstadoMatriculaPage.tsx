import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api, apiDownload } from '../../../lib/api'
import { SelectGestion } from '../../../components/select/SelectGestion'

interface EstRow {
  estudiante_id: string; codigo: string; nombre: string; apellido: string
  nivel: string; grado: string; paralelo: string; estado: string
}
interface Data {
  resumen: { PREINSCRITO: number; ACTIVO: number; RETIRADO: number; TRASLADADO: number; EGRESADO: number }
  estudiantes: EstRow[]
}

const ESTADOS = ['', 'PREINSCRITO', 'ACTIVO', 'RETIRADO', 'TRASLADADO', 'EGRESADO'] as const
const ESTADO_LABEL: Record<string, string> = {
  '': 'Todos', PREINSCRITO: 'Preinscritos', ACTIVO: 'Activos', RETIRADO: 'Retirados', TRASLADADO: 'Trasladados', EGRESADO: 'Egresados',
}
const ESTADO_BADGE: Record<string, string> = {
  PREINSCRITO: 'bg-sky-100 text-sky-700', ACTIVO: 'bg-emerald-100 text-emerald-700',
  RETIRADO: 'bg-rose-100 text-rose-700', TRASLADADO: 'bg-amber-100 text-amber-700', EGRESADO: 'bg-slate-200 text-slate-700',
}
const RESUMEN_CARDS = [
  { key: 'PREINSCRITO' as const, label: 'Preinscritos', bg: 'bg-sky-50 border-sky-200',     num: 'text-sky-700',     txt: 'text-sky-600'     },
  { key: 'ACTIVO'      as const, label: 'Activos',      bg: 'bg-green-50 border-green-200', num: 'text-green-700',   txt: 'text-green-600'   },
  { key: 'RETIRADO'    as const, label: 'Retirados',    bg: 'bg-red-50 border-red-200',     num: 'text-red-700',     txt: 'text-red-600'     },
  { key: 'TRASLADADO'  as const, label: 'Trasladados',  bg: 'bg-amber-50 border-amber-200', num: 'text-amber-700',   txt: 'text-amber-600'   },
  { key: 'EGRESADO'    as const, label: 'Egresados',    bg: 'bg-bg border-border',          num: 'text-fg',          txt: 'text-fg-muted'    },
]

export default function EstadoMatriculaPage() {
  const [gestionId, setGestionId] = useState('')
  const [estado,    setEstado]    = useState<typeof ESTADOS[number]>('')
  const [data,       setData]       = useState<Data | null>(null)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [dlState,    setDlState]    = useState<'idle' | 'pdf' | 'xlsx'>('idle')

  function qs() {
    const p = new URLSearchParams({ gestion_id: gestionId })
    if (estado) p.set('estado', estado)
    return p.toString()
  }

  async function generar() {
    if (!gestionId) return
    setLoading(true); setError(null)
    try { setData(await api.get<Data>(`/reportes/estado-matricula?${qs()}`)) }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Error al cargar') }
    finally { setLoading(false) }
  }

  async function descargar(tipo: 'pdf' | 'xlsx') {
    if (!gestionId || !data) return
    setDlState(tipo)
    try { await apiDownload(`/reportes/estado-matricula/${tipo}?${qs()}`, `estado_estudiante.${tipo === 'pdf' ? 'pdf' : 'xlsx'}`) }
    finally { setDlState('idle') }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link to=".." className="text-sm text-blue-600 hover:underline">← Reportes</Link>
        <h1 className="text-xl font-bold text-fg">🎒 Estado del Estudiante</h1>
      </div>
      <p className="text-sm text-fg-muted -mt-3">Preinscritos, activos, retirados, trasladados y egresados de la gestión seleccionada.</p>

      <div className="rounded-xl border border-border bg-surface p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SelectGestion value={gestionId} onChange={id => { setGestionId(id); setData(null) }} />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-fg">Estado</label>
            <select value={estado} onChange={e => setEstado(e.target.value as typeof ESTADOS[number])}
              className="rounded-lg border border-border px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand">
              {ESTADOS.map(e => <option key={e} value={e}>{ESTADO_LABEL[e]}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={generar} disabled={!gestionId || loading}
              className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Generando…' : 'Generar reporte'}
            </button>
          </div>
        </div>
      </div>

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {data && (
        <div className="space-y-4">
          <div className="flex gap-4 flex-wrap">
            {RESUMEN_CARDS.map(c => (
              <div key={c.key} className={`rounded-xl border px-5 py-3 text-center flex-1 min-w-[110px] ${c.bg}`}>
                <div className={`text-2xl font-bold ${c.num}`}>{data.resumen[c.key]}</div>
                <div className={`text-sm ${c.txt}`}>{c.label}</div>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
            <div className="flex justify-end gap-2">
              <button onClick={() => descargar('pdf')} disabled={dlState !== 'idle'}
                className="rounded-lg border border-blue-600 px-3 py-1.5 text-sm text-blue-700 hover:bg-blue-50 disabled:opacity-50">
                {dlState === 'pdf' ? '…' : '📄 PDF'}
              </button>
              <button onClick={() => descargar('xlsx')} disabled={dlState !== 'idle'}
                className="rounded-lg border border-green-600 px-3 py-1.5 text-sm text-green-700 hover:bg-green-50 disabled:opacity-50">
                {dlState === 'xlsx' ? '…' : '📗 Excel'}
              </button>
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
                    <tr key={e.estudiante_id} className="hover:bg-surface-2">
                      <td className="px-3 py-2 font-mono text-xs">{e.codigo}</td>
                      <td className="px-3 py-2">{e.apellido}</td>
                      <td className="px-3 py-2">{e.nombre}</td>
                      <td className="px-3 py-2">{e.nivel}</td>
                      <td className="px-3 py-2">{e.grado}</td>
                      <td className="px-3 py-2 text-center">{e.paralelo}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ESTADO_BADGE[e.estado] ?? ''}`}>{ESTADO_LABEL[e.estado] ?? e.estado}</span>
                      </td>
                    </tr>
                  ))}
                  {data.estudiantes.length === 0 && (
                    <tr><td colSpan={7} className="px-3 py-8 text-center text-fg-muted">Sin registros.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
