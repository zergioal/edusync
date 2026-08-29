import { useState, useEffect, useCallback, useRef } from 'react'
import { api, ApiError } from '../../lib/api'
import { useGestionActiva } from '../../hooks/useGestionActiva'
import { useToast } from '../../components/ui/Toast'
import { Spinner, Button } from '@edusync/ui'

type Estado = 'PRESENTE' | 'AUSENTE' | 'TARDANZA'

interface Paralelo {
  id:     string
  nombre: string
  grado:  string
  nivel:  string
}

interface Estudiante {
  estudiante_id: string
  nombre:        string
  apellido:      string
  estado:        Estado
}

const ESTADO_COLOR: Record<Estado, string> = {
  PRESENTE: 'bg-green-500 text-white',
  AUSENTE:  'bg-red-500 text-white',
  TARDANZA: 'bg-amber-500 text-white',
}

function hoy(): string {
  return new Date().toISOString().slice(0, 10)
}

export default function AsistenciaDiariaPage() {
  const toast    = useToast()
  const toastRef = useRef(toast)
  toastRef.current = toast
  const { anno } = useGestionActiva()

  const [paralelos,    setParalelos]    = useState<Paralelo[]>([])
  const [paraleloId,   setParaleloId]   = useState('')
  const [fecha,        setFecha]        = useState(hoy())
  const [lista,        setLista]        = useState<Estudiante[]>([])
  const [loading,      setLoading]      = useState(false)
  const [loadingList,  setLoadingList]  = useState(false)
  const [saving,       setSaving]       = useState(false)
  const [gestionId,    setGestionId]    = useState('')

  // Cargar paralelos y gestión
  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.get<Paralelo[]>('/asistencia/paralelos-regente'),
      api.get<{ id: string }>('/gestiones/activa'),
    ])
      .then(([p, g]) => { setParalelos(p); setGestionId(g.id) })
      .catch(() => toastRef.current.error('Error al cargar paralelos'))
      .finally(() => setLoading(false))
  }, [])

  const cargarLista = useCallback(async () => {
    if (!paraleloId || !gestionId) return
    setLoadingList(true)
    try {
      const existente = await api.get<Estudiante[]>(`/asistencia/diaria?paralelo_id=${paraleloId}&fecha=${fecha}`)
        .catch(() => [])

      if (existente.length > 0) {
        setLista(existente)
      } else {
        const estudiantes = await api.get<Array<{ estudiante_id: string; nombre: string; apellido: string }>>(
          `/asistencia/estudiantes-paralelo?paralelo_id=${paraleloId}&gestion_id=${gestionId}`,
        )
        setLista(estudiantes.map(e => ({ ...e, estado: 'PRESENTE' as Estado })))
      }
    } catch {
      toastRef.current.error('Error al cargar estudiantes')
    } finally {
      setLoadingList(false)
    }
  }, [paraleloId, fecha, gestionId])

  useEffect(() => { cargarLista() }, [cargarLista])

  function toggleEstado(id: string, estado: Estado) {
    setLista(prev => prev.map(e => e.estudiante_id === id ? { ...e, estado } : e))
  }

  function marcarTodos(estado: Estado) {
    setLista(prev => prev.map(e => ({ ...e, estado })))
  }

  async function guardar() {
    if (!paraleloId || lista.length === 0) return
    setSaving(true)
    try {
      await api.post('/asistencia/diaria', {
        paralelo_id: paraleloId,
        fecha,
        registros: lista.map(e => ({ estudiante_id: e.estudiante_id, estado: e.estado })),
      })
      toastRef.current.success('Asistencia diaria guardada')
    } catch (err) {
      toastRef.current.error(err instanceof ApiError ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-fg">Asistencia Diaria</h1>
          <p className="text-sm text-fg-muted mt-0.5">
            {anno ? `Gestión ${anno}` : 'Registro diario por paralelo'}
          </p>
        </div>
        <Button onClick={guardar} loading={saving} disabled={lista.length === 0 || !paraleloId}>
          Guardar asistencia
        </Button>
      </div>

      {/* Filtros */}
      <div className="space-y-3 rounded-xl border border-border bg-surface p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-1 min-w-[180px] flex-col gap-1">
            <label className="text-xs font-medium text-fg-muted uppercase tracking-wide">Paralelo</label>
            <select
              value={paraleloId}
              onChange={e => setParaleloId(e.target.value)}
              className="rounded-lg border border-border px-3 py-2.5 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand"
            >
              <option value="">— Seleccionar —</option>
              {paralelos.map(p => (
                <option key={p.id} value={p.id}>{p.nombre} ({p.nivel})</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-fg-muted uppercase tracking-wide">Fecha</label>
            <input
              type="date"
              value={fecha}
              onChange={e => setFecha(e.target.value)}
              max={hoy()}
              className="rounded-lg border border-border px-3 py-2.5 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
        </div>

        {lista.length > 0 && (
          <div>
            <span className="text-xs font-medium text-fg-muted uppercase tracking-wide">Marcar todos</span>
            <div className="mt-1.5 grid grid-cols-3 gap-2">
              {(['PRESENTE', 'AUSENTE', 'TARDANZA'] as Estado[]).map(e => (
                <button
                  key={e}
                  onClick={() => marcarTodos(e)}
                  className={`rounded-lg border-2 px-2 py-3 text-sm font-semibold transition-colors active:scale-95 ${
                    e === 'PRESENTE'
                      ? 'border-green-200 text-green-700 hover:bg-green-50 active:bg-green-100'
                      : e === 'AUSENTE'
                        ? 'border-red-200 text-red-700 hover:bg-red-50 active:bg-red-100'
                        : 'border-amber-200 text-amber-700 hover:bg-amber-50 active:bg-amber-100'
                  }`}
                >
                  {e === 'PRESENTE' ? 'Presentes' : e === 'AUSENTE' ? 'Ausentes' : 'Tardanza'}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Lista */}
      <div className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
        {!paraleloId ? (
          <div className="py-12 text-center text-sm text-fg-muted">Selecciona un paralelo para comenzar</div>
        ) : loadingList ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : lista.length === 0 ? (
          <div className="py-12 text-center text-sm text-fg-muted">No hay estudiantes en este paralelo</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-bg text-left text-xs font-semibold uppercase tracking-wide text-fg-muted">
                  <th className="px-3 sm:px-5 py-3 w-8">#</th>
                  <th className="px-3 sm:px-5 py-3">Estudiante</th>
                  <th className="px-3 sm:px-5 py-3 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {lista.map((est, idx) => (
                  <tr key={est.estudiante_id} className="hover:bg-surface-2 transition-colors">
                    <td className="px-3 sm:px-5 py-2 text-fg-muted text-xs">{idx + 1}</td>
                    <td className="px-3 sm:px-5 py-2 font-medium text-fg whitespace-nowrap">
                      {est.apellido}, {est.nombre}
                    </td>
                    <td className="px-3 sm:px-5 py-2">
                      <div className="flex items-center justify-center gap-2">
                        {(['PRESENTE', 'AUSENTE', 'TARDANZA'] as Estado[]).map(e => (
                          <button
                            key={e}
                            onClick={() => toggleEstado(est.estudiante_id, e)}
                            title={e}
                            className={`w-11 h-11 flex-shrink-0 rounded-full text-sm font-bold transition-all active:scale-95 ${
                              est.estado === e ? ESTADO_COLOR[e] : 'border-2 border-border text-fg-muted hover:border-gray-400'
                            }`}
                          >
                            {e[0]}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p className="text-xs text-fg-muted text-center">P = Presente · A = Ausente · T = Tardanza</p>
    </div>
  )
}
