import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api, ApiError } from '../../lib/api'
import { useToast } from '../../components/ui/Toast'
import { Icon, type IconName } from '../../components/ui/Icon'
import { Spinner } from '@edusync/ui'

type Categoria =
  | 'NO_ENTREGO_TAREA' | 'FALTO' | 'SALIO_SIN_PERMISO'
  | 'NO_RINDIO_EVALUACION' | 'CITACION_AGENDA' | 'INDISCIPLINA' | 'NO_TRABAJA_EN_CLASE' | 'OTRO'

interface Estudiante { estudiante_id: string; nombre: string; apellido: string }
interface Hoy { id: string; estudiante_id: string; categoria: Categoria; detalle: string | null; creada_en: string }
interface RosterData { estudiantes: Estudiante[]; hoy: Hoy[] }
interface AsignacionOpcion { id: string; materia: { nombre: string }; paralelo: { id: string } }

const CATEGORIAS: { value: Categoria; label: string; icon: IconName; chip: string }[] = [
  { value: 'NO_ENTREGO_TAREA',     label: 'No entregó tarea',      icon: 'document-x',    chip: 'bg-amber-100 text-amber-700 hover:bg-amber-200' },
  { value: 'FALTO',                label: 'Faltó',                 icon: 'user-x',         chip: 'bg-red-100 text-red-700 hover:bg-red-200' },
  { value: 'SALIO_SIN_PERMISO',    label: 'Salió sin permiso',     icon: 'door-exit',      chip: 'bg-orange-100 text-orange-700 hover:bg-orange-200' },
  { value: 'NO_RINDIO_EVALUACION', label: 'No rindió evaluación',  icon: 'clipboard-x',    chip: 'bg-purple-100 text-purple-700 hover:bg-purple-200' },
  { value: 'CITACION_AGENDA',      label: 'Citación en agenda',    icon: 'mail',           chip: 'bg-blue-100 text-blue-700 hover:bg-blue-200' },
  { value: 'INDISCIPLINA',         label: 'Indisciplina',          icon: 'alert-triangle', chip: 'bg-rose-100 text-rose-700 hover:bg-rose-200' },
  { value: 'NO_TRABAJA_EN_CLASE',  label: 'No trabaja en clase',   icon: 'user-minus',    chip: 'bg-teal-100 text-teal-700 hover:bg-teal-200' },
  { value: 'OTRO',                 label: 'Otro',                  icon: 'pencil',         chip: 'bg-surface-2 text-fg-muted hover:bg-surface-2/80' },
]
const CATEGORIA_LABEL = Object.fromEntries(CATEGORIAS.map(c => [c.value, c.label])) as Record<Categoria, string>

function fmtHora(s: string) {
  return new Date(s).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })
}
function fmtFecha(s: string) {
  return new Date(s).toLocaleDateString('es-BO', { day: '2-digit', month: 'short' })
}

export default function ControlDiarioParaleloPage() {
  const { paralelo_id } = useParams<{ paralelo_id: string }>()
  const navigate = useNavigate()
  const toast    = useToast()
  const toastRef = useRef(toast)
  toastRef.current = toast

  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([])
  const [hoy,          setHoy]         = useState<Hoy[]>([])
  const [asignaciones, setAsignaciones] = useState<AsignacionOpcion[]>([])
  const [asignacionId, setAsignacionId] = useState('')
  const [loading,      setLoading]     = useState(true)
  const [guardando,    setGuardando]   = useState<string | null>(null) // `${estudiante_id}:${categoria}`
  const [otroAbierto,  setOtroAbierto] = useState<string | null>(null) // estudiante_id
  const [otroTexto,    setOtroTexto]   = useState('')

  const cargar = useCallback(async () => {
    if (!paralelo_id) return
    setLoading(true)
    try {
      const [roster, mias] = await Promise.all([
        api.get<RosterData>(`/observaciones-diarias/paralelo/${paralelo_id}`),
        api.get<AsignacionOpcion[]>('/asignaciones/mias'),
      ])
      setEstudiantes(roster.estudiantes)
      setHoy(roster.hoy)
      const propias = mias.filter(a => a.paralelo.id === paralelo_id)
      setAsignaciones(propias)
      setAsignacionId(prev => prev || propias[0]?.id || '')
    } catch {
      toastRef.current.error('No se pudo cargar el curso')
    } finally {
      setLoading(false)
    }
  }, [paralelo_id])

  useEffect(() => { cargar() }, [cargar])

  async function anotar(estudiante_id: string, categoria: Categoria, detalle?: string) {
    if (!paralelo_id) return
    const key = `${estudiante_id}:${categoria}`
    setGuardando(key)
    try {
      const nueva = await api.post<Hoy>('/observaciones-diarias', {
        estudiante_id, paralelo_id, categoria, detalle,
        asignacion_id: asignacionId || undefined,
      })
      setHoy(prev => [...prev, nueva])
      toast.success(`Anotado: ${CATEGORIA_LABEL[categoria]}`)
      if (categoria === 'OTRO') { setOtroAbierto(null); setOtroTexto('') }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Error al guardar')
    } finally {
      setGuardando(null)
    }
  }

  async function deshacer(id: string) {
    try {
      await api.delete(`/observaciones-diarias/${id}`)
      setHoy(prev => prev.filter(h => h.id !== id))
    } catch {
      toast.error('No se pudo deshacer')
    }
  }

  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <button
            onClick={() => navigate('/dashboard/docente/control-diario')}
            className="mb-1 flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 font-medium transition-colors"
          >
            ← Cambiar de curso
          </button>
          <h1 className="text-xl font-bold text-fg">Control diario</h1>
          <p className="text-sm text-fg-muted mt-0.5">Clic en una categoría para anotar al toque — igual que el cuaderno.</p>
        </div>

        {asignaciones.length > 0 && (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-fg-muted">Materia *</label>
            <select
              value={asignacionId}
              onChange={e => setAsignacionId(e.target.value)}
              className="rounded-lg border border-border px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand"
            >
              {asignaciones.map(a => <option key={a.id} value={a.id}>{a.materia.nombre}</option>)}
            </select>
          </div>
        )}
      </div>

      {estudiantes.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-border bg-surface p-10 text-center text-sm text-fg-muted">
          No hay estudiantes matriculados en este paralelo.
        </div>
      ) : (
        <div className="space-y-3">
          {estudiantes.map(est => {
            const deHoy = hoy.filter(h => h.estudiante_id === est.estudiante_id)
            const usadasHoy = new Set(deHoy.filter(h => h.categoria !== 'OTRO').map(h => h.categoria))
            return (
              <div key={est.estudiante_id} className="rounded-xl border border-border bg-surface p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <p className="font-medium text-fg">{est.apellido}, {est.nombre}</p>
                  {deHoy.length > 0 && (
                    <span className="text-xs font-semibold text-amber-700 bg-amber-100 rounded-full px-2 py-0.5">
                      Hoy: {deHoy.length}
                    </span>
                  )}
                </div>

                <div className="mt-3 grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                  {CATEGORIAS.map(c => {
                    const yaRegistrada = c.value !== 'OTRO' && usadasHoy.has(c.value)
                    return (
                      <button
                        key={c.value}
                        disabled={guardando === `${est.estudiante_id}:${c.value}` || yaRegistrada}
                        title={yaRegistrada ? 'Ya registrada hoy para este estudiante' : c.label}
                        onClick={() => c.value === 'OTRO'
                          ? setOtroAbierto(otroAbierto === est.estudiante_id ? null : est.estudiante_id)
                          : anotar(est.estudiante_id, c.value)
                        }
                        className={`flex h-14 flex-col items-center justify-center gap-1 rounded-lg px-0.5 text-center text-[10px] font-semibold leading-[1.1] transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${c.chip}`}
                      >
                        <Icon name={c.icon} className="h-4 w-4" />
                        <span>{c.label}</span>
                      </button>
                    )
                  })}
                </div>

                {otroAbierto === est.estudiante_id && (
                  <div className="mt-2.5 flex gap-2">
                    <input
                      autoFocus
                      type="text"
                      value={otroTexto}
                      onChange={e => setOtroTexto(e.target.value)}
                      placeholder="Escribe la observación…"
                      className="flex-1 rounded-lg border border-border px-3 py-1.5 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand"
                    />
                    <button
                      onClick={() => anotar(est.estudiante_id, 'OTRO', otroTexto)}
                      disabled={!otroTexto.trim()}
                      className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                    >
                      Guardar
                    </button>
                  </div>
                )}

                {deHoy.length > 0 && (
                  <ul className="mt-2.5 space-y-1.5 border-t border-border pt-2.5">
                    {deHoy.map(h => (
                      <li key={h.id} className="flex items-center justify-between gap-2 text-xs text-fg-muted">
                        <span className="flex items-start gap-1.5">
                          <span className="text-indigo-400">▸</span>
                          <span>
                            <span className="font-medium text-fg">{CATEGORIA_LABEL[h.categoria]}</span>
                            {h.detalle && <> — {h.detalle}</>}
                            <span className="text-fg-muted"> · {fmtFecha(h.creada_en)}, {fmtHora(h.creada_en)}</span>
                          </span>
                        </span>
                        <button onClick={() => deshacer(h.id)} className="text-red-500 hover:text-red-700 font-medium whitespace-nowrap">
                          Deshacer
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
