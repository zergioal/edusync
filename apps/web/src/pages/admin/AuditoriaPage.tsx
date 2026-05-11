import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { Spinner, Badge } from '@edusync/ui'

interface LogEntry {
  id:             string
  usuario_id:     string | null
  accion:         string
  recurso:        string
  recurso_id:     string | null
  ip:             string | null
  creado_en:      string
  detalle:        Record<string, unknown> | null
}

const ACCION_VARIANT: Record<string, 'success' | 'warning' | 'danger'> = {
  CREATE: 'success',
  UPDATE: 'warning',
  DELETE: 'danger',
}

export default function AuditoriaPage() {
  const [logs,     setLogs]     = useState<LogEntry[]>([])
  const [loading,  setLoading]  = useState(true)
  const [recurso,  setRecurso]  = useState('')
  const [accion,   setAccion]   = useState('')
  const [page,     setPage]     = useState(1)
  const [hasMore,  setHasMore]  = useState(false)

  async function cargar(reset = false) {
    const p = reset ? 1 : page
    if (reset) setPage(1)
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(p), limit: '50' })
      if (recurso) params.set('recurso', recurso)
      if (accion)  params.set('accion', accion)
      const data = await api.get<LogEntry[]>(`/auditoria?${params}`)
      setLogs(reset ? data : prev => [...prev, ...data])
      setHasMore(data.length === 50)
    } catch { /* silencioso */ }
    finally { setLoading(false) }
  }

  useEffect(() => { cargar(true) }, [recurso, accion])

  function fmt(s: string) {
    return new Date(s).toLocaleString('es-BO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Auditoría del Sistema</h1>
        <p className="text-sm text-gray-500 mt-0.5">Registro de acciones realizadas</p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <input
          type="text"
          placeholder="Filtrar por recurso..."
          value={recurso}
          onChange={e => setRecurso(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={accion}
          onChange={e => setAccion(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todas las acciones</option>
          <option value="CREATE">CREATE</option>
          <option value="UPDATE">UPDATE</option>
          <option value="DELETE">DELETE</option>
        </select>
      </div>

      {/* Tabla */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {loading && logs.length === 0 ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : logs.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">Sin registros de auditoría</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="px-5 py-3 text-left">Fecha</th>
                <th className="px-5 py-3 text-left">Acción</th>
                <th className="px-5 py-3 text-left">Recurso</th>
                <th className="px-5 py-3 text-left">ID Recurso</th>
                <th className="px-5 py-3 text-left">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {logs.map(l => (
                <tr key={l.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 text-gray-500 whitespace-nowrap">{fmt(l.creado_en)}</td>
                  <td className="px-5 py-3">
                    <Badge variant={ACCION_VARIANT[l.accion] ?? 'info'}>{l.accion}</Badge>
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-gray-700">{l.recurso}</td>
                  <td className="px-5 py-3 font-mono text-xs text-gray-500 truncate max-w-[120px]">{l.recurso_id ?? '—'}</td>
                  <td className="px-5 py-3 text-xs text-gray-400">{l.ip ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {hasMore && !loading && (
          <div className="flex justify-center py-4 border-t border-gray-100">
            <button
              onClick={() => { setPage(p => p + 1); cargar() }}
              className="text-sm text-blue-600 hover:underline"
            >
              Cargar más
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
