import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { api, ApiError } from '../../lib/api'
import { useGestionActiva } from '../../hooks/useGestionActiva'
import { useToast } from '../../components/ui/Toast'
import { hoyLocalStr } from '../../lib/date'
import { Icon, type IconName } from '../../components/ui/Icon'
import { Spinner, Button, Badge } from '@edusync/ui'

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

const ESTADOS: Estado[] = ['PRESENTE', 'AUSENTE', 'TARDANZA']

const ESTADO_META: Record<Estado, { label: string; letra: string; icon: IconName; active: string; ring: string; row: string }> = {
  PRESENTE: { label: 'Presente', letra: 'P', icon: 'user-check', active: 'bg-green-500 border-green-500 text-white', ring: 'border-green-200 text-green-700 hover:bg-green-50 active:bg-green-100', row: 'border-l-4 border-l-green-400' },
  AUSENTE:  { label: 'Ausente',  letra: 'F', icon: 'user-x',      active: 'bg-red-500 border-red-500 text-white',    ring: 'border-red-200 text-red-700 hover:bg-red-50 active:bg-red-100',       row: 'border-l-4 border-l-red-400' },
  TARDANZA: { label: 'Tardanza', letra: 'T', icon: 'clock',       active: 'bg-amber-500 border-amber-500 text-white', ring: 'border-amber-200 text-amber-700 hover:bg-amber-50 active:bg-amber-100', row: 'border-l-4 border-l-amber-400' },
}

function fmtFechaLarga(fecha: string): string {
  const d = new Date(`${fecha}T00:00:00`)
  const s = d.toLocaleDateString('es-BO', { weekday: 'long', day: 'numeric', month: 'long' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export default function AsistenciaDiariaPage() {
  const toast    = useToast()
  const toastRef = useRef(toast)
  toastRef.current = toast
  const { anno } = useGestionActiva()

  const [paralelos,     setParalelos]     = useState<Paralelo[]>([])
  const [paraleloId,    setParaleloId]    = useState('')
  const [fecha,         setFecha]         = useState(hoyLocalStr())
  const [lista,         setLista]         = useState<Estudiante[]>([])
  const [yaRegistrada,  setYaRegistrada]  = useState(false)
  const [loading,       setLoading]       = useState(false)
  const [loadingList,   setLoadingList]   = useState(false)
  const [saving,        setSaving]        = useState(false)
  const [gestionId,     setGestionId]     = useState('')

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
        setYaRegistrada(true)
      } else {
        const estudiantes = await api.get<Array<{ estudiante_id: string; nombre: string; apellido: string }>>(
          `/asistencia/estudiantes-paralelo?paralelo_id=${paraleloId}&gestion_id=${gestionId}`,
        )
        setLista(estudiantes.map(e => ({ ...e, estado: 'PRESENTE' as Estado })))
        setYaRegistrada(false)
      }
    } catch {
      toastRef.current.error('Error al cargar estudiantes')
    } finally {
      setLoadingList(false)
    }
  }, [paraleloId, fecha, gestionId])

  useEffect(() => { cargarLista() }, [cargarLista])

  const conteo = useMemo(() => {
    const c: Record<Estado, number> = { PRESENTE: 0, AUSENTE: 0, TARDANZA: 0 }
    for (const e of lista) c[e.estado]++
    return c
  }, [lista])

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
      setYaRegistrada(true)
      toastRef.current.success('Asistencia diaria guardada')
    } catch (err) {
      toastRef.current.error(err instanceof ApiError ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>

  const paraleloActual = paralelos.find(p => p.id === paraleloId)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-fg">Asistencia Diaria</h1>
        <p className="text-sm text-fg-muted mt-0.5">
          {anno ? `Gestión ${anno} · ` : ''}{fmtFechaLarga(fecha)}
        </p>
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
              max={hoyLocalStr()}
              className="rounded-lg border border-border px-3 py-2.5 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
        </div>

        {lista.length > 0 && (
          <div>
            <span className="text-xs font-medium text-fg-muted uppercase tracking-wide">Marcar todos</span>
            <div className="mt-1.5 grid grid-cols-3 gap-2">
              {ESTADOS.map(e => (
                <button
                  key={e}
                  onClick={() => marcarTodos(e)}
                  className={`flex items-center justify-center gap-1.5 rounded-lg border-2 px-2 py-3 text-sm font-semibold transition-colors active:scale-95 ${ESTADO_META[e].ring}`}
                >
                  <Icon name={ESTADO_META[e].icon} className="h-4 w-4" />
                  {ESTADO_META[e].label}s
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Barra de estado: conteo en vivo + guardar */}
      {lista.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-3 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="success">{conteo.PRESENTE} presentes</Badge>
            <Badge variant="danger">{conteo.AUSENTE} ausentes</Badge>
            <Badge variant="warning">{conteo.TARDANZA} tardanza</Badge>
            {yaRegistrada && (
              <span className="flex items-center gap-1 text-xs text-fg-muted">
                <Icon name="user-check" className="h-3.5 w-3.5" />
                Ya se registró este día — puedes corregirlo y guardar de nuevo
              </span>
            )}
          </div>
          <Button onClick={guardar} loading={saving} disabled={loadingList}>
            <Icon name="save" className="h-4 w-4" />
            Guardar asistencia
          </Button>
        </div>
      )}

      {/* Lista */}
      <div className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
        {!paraleloId ? (
          <div className="flex flex-col items-center gap-2 py-14 text-center text-sm text-fg-muted">
            <Icon name="users" className="h-8 w-8 text-fg-muted/50" />
            Selecciona un paralelo para comenzar
          </div>
        ) : loadingList ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : lista.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-14 text-center text-sm text-fg-muted">
            <Icon name="user-x" className="h-8 w-8 text-fg-muted/50" />
            No hay estudiantes en este paralelo
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-bg text-left text-xs font-semibold uppercase tracking-wide text-fg-muted">
                  <th className="px-3 sm:px-5 py-3 w-8">#</th>
                  <th className="px-3 sm:px-5 py-3">
                    Estudiante
                    {paraleloActual && <span className="ml-1.5 font-normal normal-case text-fg-muted/70">· {paraleloActual.nombre}</span>}
                  </th>
                  <th className="px-3 sm:px-5 py-3 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {lista.map((est, idx) => (
                  <tr key={est.estudiante_id} className={`hover:bg-surface-2 transition-colors ${ESTADO_META[est.estado].row}`}>
                    <td className="px-3 sm:px-5 py-2 text-fg-muted text-xs">{idx + 1}</td>
                    <td className="px-3 sm:px-5 py-2 font-medium text-fg whitespace-nowrap">
                      {est.apellido}, {est.nombre}
                    </td>
                    <td className="px-3 sm:px-5 py-2">
                      <div className="flex items-center justify-center gap-2">
                        {ESTADOS.map(e => (
                          <button
                            key={e}
                            onClick={() => toggleEstado(est.estudiante_id, e)}
                            title={ESTADO_META[e].label}
                            aria-label={ESTADO_META[e].label}
                            className={`w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-full border-2 text-sm font-bold transition-all active:scale-95 ${
                              est.estado === e ? ESTADO_META[e].active : 'border-border text-fg-muted hover:border-gray-400'
                            }`}
                          >
                            {ESTADO_META[e].letra}
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

      {lista.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-fg-muted">
          {ESTADOS.map(e => (
            <span key={e} className="flex items-center gap-1.5">
              <strong>{ESTADO_META[e].letra}</strong> = {ESTADO_META[e].label}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
