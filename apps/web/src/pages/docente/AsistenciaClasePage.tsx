import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { api, ApiError } from '../../lib/api'
import { useToast } from '../../components/ui/Toast'
import { Spinner, Button } from '@edusync/ui'

type Estado = 'PRESENTE' | 'AUSENTE' | 'TARDANZA'

interface Estudiante {
  estudiante_id: string
  nombre:        string
  apellido:      string
  estado:        Estado
}

interface AsignacionInfo {
  id:        string
  materia:   { nombre: string }
  paralelo:  { id: string; letra: string; grado: { nombre: string } }
  gestion:   { id: string }
}

const ESTADO_COLOR: Record<Estado, string> = {
  PRESENTE: 'bg-green-500 text-white',
  AUSENTE:  'bg-red-500 text-white',
  TARDANZA: 'bg-amber-500 text-white',
}

function hoy(): string {
  return new Date().toISOString().slice(0, 10)
}

export default function AsistenciaClasePage() {
  const { asignacion_id } = useParams<{ asignacion_id: string }>()
  const toast    = useToast()
  const toastRef = useRef(toast)
  toastRef.current = toast

  const [asignacion, setAsignacion] = useState<AsignacionInfo | null>(null)
  const [fecha,      setFecha]      = useState(hoy())
  const [lista,      setLista]      = useState<Estudiante[]>([])
  const [loading,    setLoading]    = useState(true)
  const [saving,     setSaving]     = useState(false)
  const [loadingList, setLoadingList] = useState(false)

  useEffect(() => {
    if (!asignacion_id) return
    api.get<AsignacionInfo>(`/asignaciones/${asignacion_id}`)
      .then(setAsignacion)
      .catch(() => toastRef.current.error('No se pudo cargar la asignación'))
      .finally(() => setLoading(false))
  }, [asignacion_id])

  const cargarLista = useCallback(async () => {
    if (!asignacion_id || !asignacion) return
    setLoadingList(true)
    try {
      // Intentar cargar registros existentes para esa fecha
      const existente = await api.get<Estudiante[]>(
        `/asistencia/clase?asignacion_id=${asignacion_id}&fecha=${fecha}`,
      ).catch(() => [])

      if (existente.length > 0) {
        setLista(existente)
        return
      }

      // No hay registros → cargar nómina del paralelo
      const nominaRaw = await api.get<Array<{ estudiante_id: string; nombre: string; apellido: string }>>(
        `/asistencia/estudiantes-paralelo?paralelo_id=${asignacion.paralelo.id}&gestion_id=${asignacion.gestion.id}`,
      )
      setLista(nominaRaw.map(e => ({ ...e, estado: 'PRESENTE' as Estado })))
    } catch {
      toastRef.current.error('Error al cargar la lista de estudiantes')
    } finally {
      setLoadingList(false)
    }
  }, [asignacion_id, fecha, asignacion])

  useEffect(() => {
    if (asignacion) cargarLista()
  }, [asignacion, cargarLista])

  function toggleEstado(id: string, estado: Estado) {
    setLista(prev => prev.map(e => e.estudiante_id === id ? { ...e, estado } : e))
  }

  function marcarTodos(estado: Estado) {
    setLista(prev => prev.map(e => ({ ...e, estado })))
  }

  async function guardar() {
    if (!asignacion_id || lista.length === 0) return
    setSaving(true)
    try {
      await api.post('/asistencia/clase', {
        asignacion_id,
        fecha,
        registros: lista.map(e => ({ estudiante_id: e.estudiante_id, estado: e.estado })),
      })
      toastRef.current.success('Asistencia guardada')
    } catch (err) {
      toastRef.current.error(err instanceof ApiError ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>

  const titulo = asignacion
    ? `${asignacion.materia.nombre} — ${asignacion.paralelo.grado.nombre} "${asignacion.paralelo.letra}"`
    : 'Asistencia de Clase'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Asistencia de Clase</h1>
          <p className="text-sm text-gray-500 mt-0.5">{titulo}</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={fecha}
            onChange={e => setFecha(e.target.value)}
            max={hoy()}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Button onClick={guardar} loading={saving} disabled={lista.length === 0}>
            Guardar asistencia
          </Button>
        </div>
      </div>

      {/* Acciones masivas */}
      {lista.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Marcar todos:</span>
          {(['PRESENTE', 'AUSENTE', 'TARDANZA'] as Estado[]).map(e => (
            <button
              key={e}
              onClick={() => marcarTodos(e)}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold hover:bg-gray-50 transition-colors"
            >
              {e === 'PRESENTE' ? 'Presentes' : e === 'AUSENTE' ? 'Ausentes' : 'Tardanza'}
            </button>
          ))}
        </div>
      )}

      {/* Lista */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {loadingList ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : lista.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">
            No hay estudiantes matriculados en este paralelo
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="px-5 py-3 w-10">#</th>
                <th className="px-5 py-3">Estudiante</th>
                <th className="px-5 py-3 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {lista.map((est, idx) => (
                <tr key={est.estudiante_id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 text-gray-400 text-xs">{idx + 1}</td>
                  <td className="px-5 py-3 font-medium text-gray-900">
                    {est.apellido}, {est.nombre}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-center gap-1">
                      {(['PRESENTE', 'AUSENTE', 'TARDANZA'] as Estado[]).map(e => (
                        <button
                          key={e}
                          onClick={() => toggleEstado(est.estudiante_id, e)}
                          title={e}
                          className={`w-8 h-8 rounded-full text-xs font-bold transition-all ${
                            est.estado === e
                              ? ESTADO_COLOR[e]
                              : 'border border-gray-200 text-gray-400 hover:border-gray-400'
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
        )}
      </div>

      <p className="text-xs text-gray-400 text-center">
        P = Presente · A = Ausente · T = Tardanza
      </p>
    </div>
  )
}
