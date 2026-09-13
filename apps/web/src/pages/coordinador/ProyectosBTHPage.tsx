import { useState, useEffect, useCallback, useRef } from 'react'
import { api, ApiError } from '../../lib/api'
import { useGestionActiva } from '../../hooks/useGestionActiva'
import { useToast } from '../../components/ui/Toast'
import { Button, Badge, Spinner } from '@edusync/ui'
import { SelectParalelo } from '../../components/select/SelectParalelo'

// ─── Types ────────────────────────────────────────────────────────────────────

type EstadoDefensa = 'PENDIENTE' | 'APROBADO' | 'NO_APROBADO'

interface EstudianteRef { id: string; nombre: string; apellido: string }
interface Proyecto {
  id:                string
  nombre:            string
  porcentaje_avance: number
  estado_defensa:    EstadoDefensa
  estudiantes:       { estudiante: EstudianteRef & { id: string } }[]
}

const ESTADO_LABEL: Record<EstadoDefensa, string> = {
  PENDIENTE: 'Pendiente', APROBADO: 'Aprobado', NO_APROBADO: 'No aprobado',
}
const ESTADO_COLOR: Record<EstadoDefensa, string> = {
  PENDIENTE:   'bg-surface-2 text-fg-muted',
  APROBADO:    'bg-green-100 text-green-700',
  NO_APROBADO: 'bg-red-100 text-red-700',
}

// ─── Modal: crear / editar estudiantes de un proyecto ─────────────────────────

function ProyectoModal({ target, gestionId, onClose, onSaved }: {
  target:    Proyecto | null // null = crear
  gestionId: string
  onClose:   () => void
  onSaved:   () => void
}) {
  const toast = useToast()
  const [nombre,     setNombre]     = useState(target?.nombre ?? '')
  const [paraleloId, setParaleloId] = useState('')
  const [candidatos, setCandidatos] = useState<{ id: string; codigo: string; apellido: string; nombre: string }[]>([])
  const [loadingCand, setLoadingCand] = useState(false)
  const [seleccion,  setSeleccion]  = useState<string[]>(target?.estudiantes.map(e => e.estudiante.id) ?? [])
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  // Al elegir un curso de 6to, cargar quiénes cursan BTH ahí
  useEffect(() => {
    if (!paraleloId || !gestionId) { setCandidatos([]); return }
    setLoadingCand(true)
    api.get<{ cursan: { id: string; codigo: string; apellido: string; nombre: string }[] }>(
      `/reportes/bth/lista-tecnica?paralelo_id=${paraleloId}&gestion_id=${gestionId}`
    ).then(res => setCandidatos(res.cursan)).catch(() => setCandidatos([])).finally(() => setLoadingCand(false))
  }, [paraleloId, gestionId])

  function toggle(id: string) {
    setSeleccion(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (seleccion.length === 0) { setError('Seleccioná al menos un estudiante'); return }
    setSaving(true); setError(null)
    try {
      if (target) {
        await api.patch(`/proyectos-bth/${target.id}`, { nombre, estudiante_ids: seleccion })
        toast.success('Proyecto actualizado')
      } else {
        await api.post('/proyectos-bth', { nombre, gestion_id: gestionId, estudiante_ids: seleccion })
        toast.success('Proyecto creado')
      }
      onSaved(); onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-surface p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-fg">{target ? 'Editar proyecto' : 'Nuevo proyecto BTH'}</h2>
          <button onClick={onClose} className="text-fg-muted hover:text-fg-muted text-xl leading-none">×</button>
        </div>

        {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <form onSubmit={submit} className="space-y-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-fg-muted uppercase tracking-wide">Nombre del proyecto</span>
            <input required value={nombre} onChange={e => setNombre(e.target.value)}
              className="rounded-lg border border-border px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand" />
          </label>

          <SelectParalelo
            value={paraleloId} onChange={setParaleloId}
            nivelesPermitidos={['SECUNDARIA']} gradoOrdenes={[6]}
            label="Curso (6to de Secundaria)"
          />

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-fg-muted uppercase tracking-wide">Estudiantes que cursan BTH en ese curso</span>
            {loadingCand ? (
              <div className="flex justify-center py-4"><Spinner /></div>
            ) : candidatos.length === 0 ? (
              <p className="text-sm text-fg-muted italic">Elegí un curso para ver los estudiantes que cursan BTH.</p>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-1 rounded-lg border border-border p-2">
                {candidatos.map(c => (
                  <label key={c.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-surface-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="accent-brand"
                      checked={seleccion.includes(c.id)}
                      onChange={() => toggle(c.id)}
                    />
                    {c.apellido}, {c.nombre}
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button type="submit" loading={saving}>{target ? 'Guardar cambios' : 'Crear proyecto'}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Page principal ───────────────────────────────────────────────────────────

export default function ProyectosBTHPage() {
  const toast    = useToast()
  const toastRef = useRef(toast)
  toastRef.current = toast
  const { id: gestionId, gestionLabel } = useGestionActiva()

  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [loading,   setLoading]   = useState(true)
  const [modal,     setModal]     = useState<'new' | Proyecto | null>(null)

  const load = useCallback(async () => {
    if (!gestionId) return
    setLoading(true)
    try {
      setProyectos(await api.get<Proyecto[]>(`/proyectos-bth?gestion_id=${gestionId}`))
    } catch {
      toastRef.current.error('No se pudieron cargar los proyectos (¿tienes acceso a BTH?)')
    } finally {
      setLoading(false)
    }
  }, [gestionId])

  useEffect(() => { load() }, [load])

  async function actualizarAvance(p: Proyecto, porcentaje_avance: number) {
    try {
      await api.patch(`/proyectos-bth/${p.id}`, { porcentaje_avance })
      load()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Error al guardar')
    }
  }

  async function actualizarEstado(p: Proyecto, estado_defensa: EstadoDefensa) {
    try {
      await api.patch(`/proyectos-bth/${p.id}`, { estado_defensa })
      load()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Error al guardar')
    }
  }

  async function handleDelete(p: Proyecto) {
    if (!confirm(`¿Eliminar el proyecto "${p.nombre}"?`)) return
    try {
      await api.delete(`/proyectos-bth/${p.id}`)
      toast.success('Proyecto eliminado')
      load()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Error al eliminar')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-fg">Proyectos BTH</h1>
          <p className="text-sm text-fg-muted mt-0.5">6to de Secundaria — {gestionLabel}</p>
        </div>
        <Button onClick={() => setModal('new')} disabled={!gestionId}>+ Nuevo proyecto</Button>
      </div>

      <div className="rounded-xl border border-border bg-surface shadow-sm overflow-x-auto">
        <table className="w-full min-w-[700px] text-sm">
          <thead>
            <tr className="border-b border-border bg-bg text-left text-xs font-semibold uppercase tracking-wide text-fg-muted">
              <th className="px-4 py-3">Proyecto</th>
              <th className="px-4 py-3">Estudiantes</th>
              <th className="px-4 py-3 text-center">% Avance</th>
              <th className="px-4 py-3 text-center">Defensa</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading && (
              <tr><td colSpan={5} className="py-12 text-center"><Spinner /></td></tr>
            )}
            {!loading && proyectos.length === 0 && (
              <tr><td colSpan={5} className="py-12 text-center text-fg-muted">No hay proyectos registrados.</td></tr>
            )}
            {proyectos.map(p => (
              <tr key={p.id} className="hover:bg-surface-2 transition-colors align-top">
                <td className="px-4 py-3 font-medium text-fg">{p.nombre}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {p.estudiantes.map(e => (
                      <Badge key={e.estudiante.id} variant="info">{e.estudiante.apellido}, {e.estudiante.nombre}</Badge>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <input
                    type="number" min={0} max={100} defaultValue={p.porcentaje_avance}
                    onBlur={e => {
                      const v = Math.max(0, Math.min(100, Number(e.target.value) || 0))
                      if (v !== p.porcentaje_avance) actualizarAvance(p, v)
                    }}
                    className="w-16 rounded-lg border border-border px-2 py-1 text-center text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                  <span className="text-fg-muted text-xs ml-1">%</span>
                </td>
                <td className="px-4 py-3 text-center">
                  <select
                    value={p.estado_defensa}
                    onChange={e => actualizarEstado(p, e.target.value as EstadoDefensa)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold border-0 ${ESTADO_COLOR[p.estado_defensa]}`}
                  >
                    {(Object.keys(ESTADO_LABEL) as EstadoDefensa[]).map(k => (
                      <option key={k} value={k}>{ESTADO_LABEL[k]}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1.5 flex-nowrap">
                    <Button variant="ghost" size="sm" onClick={() => setModal(p)}>Editar</Button>
                    <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => handleDelete(p)}>×</Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal !== null && gestionId && (
        <ProyectoModal
          target={modal === 'new' ? null : modal}
          gestionId={gestionId}
          onClose={() => setModal(null)}
          onSaved={load}
        />
      )}
    </div>
  )
}
