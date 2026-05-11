import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'

interface MorosoRow {
  estudiante: { id: string; nombre: string; apellido: string; codigo: string }
  paralelo:   { letra: string; grado: string } | null
  nivel:             string | null
  monto_mensual:     number
  meses_pendientes:      number
  monto_total_pendiente: number
  ultimo_pago:           string | null
}

interface Gestion  { id: string; anno: number }
interface Paralelo { id: string; letra: string; grado: { nombre: string } }

export default function MorosidadPage() {
  const [gestiones,  setGestiones]  = useState<Gestion[]>([])
  const [paralelos,  setParalelos]  = useState<Paralelo[]>([])
  const [morosos,    setMorosos]    = useState<MorosoRow[]>([])
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [gestionId,  setGestionId]  = useState('')
  const [paraleloId, setParaleloId] = useState('')
  const [minMeses,   setMinMeses]   = useState(1)

  useEffect(() => {
    api.get<Gestion[]>('/gestiones').then(gs => {
      setGestiones(gs)
      if (gs[0]) setGestionId(gs[0].id)
    }).catch(() => {})
    api.get<Paralelo[]>('/paralelos').then(setParalelos).catch(() => {})
  }, [])

  const load = useCallback(async () => {
    if (!gestionId) return
    setLoading(true)
    setError(null)
    try {
      const qs = new URLSearchParams({ gestion_id: gestionId, ...(paraleloId ? { paralelo_id: paraleloId } : {}) })
      setMorosos(await api.get<MorosoRow[]>(`/pensiones/morosidad?${qs}`))
    } catch {
      setError('No se pudo cargar el reporte')
    } finally {
      setLoading(false)
    }
  }, [gestionId, paraleloId])

  useEffect(() => { load() }, [load])

  const filtrados = morosos.filter(m => m.meses_pendientes >= minMeses)

  const exportCSV = () => {
    const header = 'Código,Estudiante,Nivel,Paralelo,Monto/mes,Meses pendientes,Monto total,Último pago'
    const rows = filtrados.map(m =>
      [
        m.estudiante.codigo,
        `${m.estudiante.apellido} ${m.estudiante.nombre}`,
        m.nivel ?? '',
        m.paralelo ? `${m.paralelo.grado} "${m.paralelo.letra}"` : '',
        m.monto_mensual.toFixed(2),
        m.meses_pendientes,
        m.monto_total_pendiente.toFixed(2),
        m.ultimo_pago ? new Date(m.ultimo_pago).toLocaleDateString('es-BO') : 'Nunca',
      ].join(',')
    )
    const csv  = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'morosidad.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/dashboard/admin/finanzas"
            className="text-gray-400 hover:text-gray-700 transition-colors">
            ← Pensiones
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Reporte de Morosidad</h1>
        </div>
        <button onClick={exportCSV}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
          </svg>
          Exportar CSV
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="flex flex-wrap gap-3">
          <select value={gestionId} onChange={e => setGestionId(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
            {gestiones.map(g => <option key={g.id} value={g.id}>Gestión {g.anno}</option>)}
          </select>

          <select value={paraleloId} onChange={e => setParaleloId(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
            <option value="">Todos los paralelos</option>
            {paralelos.map(p => (
              <option key={p.id} value={p.id}>{p.grado.nombre} "{p.letra}"</option>
            ))}
          </select>

          <select value={minMeses} onChange={e => setMinMeses(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
            <option value={1}>1+ meses de mora</option>
            <option value={2}>2+ meses de mora</option>
            <option value={3}>3+ meses de mora</option>
          </select>
        </div>
      </div>

      {/* Resumen */}
      <div className="flex gap-4">
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <p className="text-xs text-red-500 font-medium">Estudiantes morosos</p>
          <p className="text-2xl font-bold text-red-700">{filtrados.length}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <p className="text-xs text-red-500 font-medium">Deuda total</p>
          <p className="text-2xl font-bold text-red-700">
            Bs. {filtrados.reduce((s, m) => s + m.monto_total_pendiente, 0).toFixed(2)}
          </p>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400 text-sm">Cargando…</div>
        ) : error ? (
          <div className="p-8 text-center text-red-500 text-sm">{error}</div>
        ) : filtrados.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-sm">
            Sin estudiantes morosos con los filtros seleccionados
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Estudiante', 'Nivel', 'Paralelo', 'Bs./mes', 'Meses de mora', 'Monto total', 'Último pago', 'Acciones'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtrados.map(m => (
                  <tr key={m.estudiante.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{m.estudiante.apellido} {m.estudiante.nombre}</p>
                      <p className="text-xs text-gray-400 font-mono">{m.estudiante.codigo}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">{m.nivel ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {m.paralelo ? `${m.paralelo.grado} "${m.paralelo.letra}"` : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-700 font-mono text-xs">Bs. {m.monto_mensual.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        m.meses_pendientes >= 3 ? 'bg-red-100 text-red-700' :
                        m.meses_pendientes === 2 ? 'bg-orange-100 text-orange-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {m.meses_pendientes} {m.meses_pendientes === 1 ? 'mes' : 'meses'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-red-600">
                      Bs. {m.monto_total_pendiente.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {m.ultimo_pago ? new Date(m.ultimo_pago).toLocaleDateString('es-BO') : 'Nunca'}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/dashboard/admin/finanzas/estudiante/${m.estudiante.id}`}
                        className="text-blue-600 hover:text-blue-800 text-xs font-medium hover:underline whitespace-nowrap"
                      >
                        Ver estado de cuenta
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
