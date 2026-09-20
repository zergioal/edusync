import { useState, useEffect, useCallback, useRef } from 'react'
import { api, ApiError } from '../../lib/api'
import { useToast } from '../ui/Toast'
import { Button, Spinner } from '@edusync/ui'
import { useGestionActiva } from '../../hooks/useGestionActiva'
import { trimestreLabel } from '../../lib/trimestre'

interface Nivel { id: string; nombre: string }
interface Paralelo {
  id: string; letra: string
  grado: { id: string; nombre: string; orden: number; nivel: { id: string; nombre: string } }
}
interface Asignacion {
  id: string
  materia: { nombre: string; campo: { nombre: string } }
  docente: { usuario: { nombre: string; apellido: string } }
}
interface NotaExtraRow {
  estudiante_id: string; nombre: string; apellido: string; codigo: string
  valor: number | null; motivo: string | null
}

/** Nota extracurricular (Admin/Director/Coordinador/Secretaría) — compartido entre los 4 roles. */
export function NotaExtracurricularPage() {
  const toast    = useToast()
  const toastRef = useRef(toast)
  toastRef.current = toast
  const { trimestres } = useGestionActiva()

  const [niveles,      setNiveles]      = useState<Nivel[]>([])
  const [nivelId,      setNivelId]      = useState('')
  const [paralelos,    setParalelos]    = useState<Paralelo[]>([])
  const [paraleloId,   setParaleloId]   = useState('')
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([])
  const [asignacionId, setAsignacionId] = useState('')
  const [trimestreId,  setTrimestreId]  = useState('')
  const [filas,        setFilas]        = useState<NotaExtraRow[]>([])
  const [overrides,    setOverrides]    = useState<Record<string, string>>({})
  const [loading,      setLoading]      = useState(false)
  const [saving,       setSaving]       = useState(false)

  useEffect(() => {
    api.get<Nivel[]>('/niveles')
      .then(data => { setNiveles(data); if (data[0]) setNivelId(data[0].id) })
      .catch(() => toastRef.current.error('Error cargando niveles'))
    api.get<Paralelo[]>('/paralelos')
      .then(setParalelos)
      .catch(() => toastRef.current.error('Error cargando cursos'))
  }, [])

  useEffect(() => {
    if (trimestres.length > 0 && !trimestreId) {
      setTrimestreId(trimestres.find(t => !t.cerrado)?.id ?? trimestres[trimestres.length - 1]!.id)
    }
  }, [trimestres, trimestreId])

  useEffect(() => { setParaleloId(''); setAsignaciones([]); setAsignacionId('') }, [nivelId])

  useEffect(() => {
    if (!paraleloId) { setAsignaciones([]); setAsignacionId(''); return }
    api.get<Asignacion[]>(`/asignaciones?paralelo_id=${paraleloId}`)
      .then(data => { setAsignaciones(data); setAsignacionId(data[0]?.id ?? '') })
      .catch(() => toastRef.current.error('Error cargando materias'))
  }, [paraleloId])

  const cargar = useCallback(async () => {
    if (!asignacionId || !trimestreId) { setFilas([]); return }
    setLoading(true)
    setOverrides({})
    try {
      setFilas(await api.get<NotaExtraRow[]>(`/planilla/${asignacionId}/nota-extracurricular?trimestre_id=${trimestreId}`))
    } catch {
      toastRef.current.error('Error cargando notas extracurriculares')
    } finally {
      setLoading(false)
    }
  }, [asignacionId, trimestreId])

  useEffect(() => { cargar() }, [cargar])

  const paralelosDelNivel = paralelos
    .filter(p => p.grado.nivel.id === nivelId)
    .sort((a, b) => a.grado.orden - b.grado.orden || a.letra.localeCompare(b.letra))

  const getValor = (estudiante_id: string): string => {
    if (overrides[estudiante_id] !== undefined) return overrides[estudiante_id]
    const fila = filas.find(f => f.estudiante_id === estudiante_id)
    return fila?.valor != null ? String(fila.valor) : ''
  }
  const setValor = (estudiante_id: string, val: string) =>
    setOverrides(prev => ({ ...prev, [estudiante_id]: val }))

  const hasChanges = Object.keys(overrides).length > 0

  const guardar = async () => {
    setSaving(true)
    try {
      const entries = Object.entries(overrides).map(([estudiante_id, val]) => ({
        estudiante_id,
        valor: val.trim() === '' ? null : parseInt(val, 10),
      }))
      await api.put(`/planilla/${asignacionId}/nota-extracurricular?trimestre_id=${trimestreId}`, entries)
      toast.success('Notas extracurriculares guardadas')
      cargar()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30 px-4 py-3 text-sm text-indigo-800 dark:text-indigo-300">
        La nota extracurricular se suma al total de la materia junto con las dimensiones, y se ve
        normal en el registro del docente — pero solo Admin, Director, Coordinador y Secretaría
        pueden cargarla o editarla. Úsala para importar notas históricas sin desglose (deja el valor
        igual al total que quieres que muestre) o para sumar puntos en casos excepcionales.
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        {niveles.map(n => (
          <button
            key={n.id}
            type="button"
            onClick={() => setNivelId(n.id)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              nivelId === n.id ? 'bg-blue-600 text-white shadow-sm' : 'bg-surface-2 text-fg-muted hover:bg-surface-2'
            }`}
          >
            {n.nombre}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-fg">Curso</label>
          <select
            value={paraleloId}
            onChange={e => setParaleloId(e.target.value)}
            className="rounded-lg border border-border px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand"
          >
            <option value="">— Selecciona un curso —</option>
            {paralelosDelNivel.map(p => (
              <option key={p.id} value={p.id}>{p.grado.nombre} &quot;{p.letra}&quot;</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-fg">Materia</label>
          <select
            value={asignacionId}
            onChange={e => setAsignacionId(e.target.value)}
            disabled={!paraleloId}
            className="rounded-lg border border-border px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand disabled:opacity-50"
          >
            <option value="">— Selecciona una materia —</option>
            {asignaciones.map(a => (
              <option key={a.id} value={a.id}>
                {a.materia.nombre} — {a.docente.usuario.apellido}, {a.docente.usuario.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-fg">Trimestre</label>
          <div className="flex rounded-lg border border-border overflow-hidden">
            {trimestres.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTrimestreId(t.id)}
                className={`flex-1 px-3 py-2 text-xs font-semibold transition-colors ${
                  trimestreId === t.id ? 'bg-brand text-brand-fg' : 'bg-surface text-fg-muted hover:bg-surface-2'
                }`}
              >
                {trimestreLabel(t.numero)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {!asignacionId && (
        <div className="rounded-xl border-2 border-dashed border-border bg-surface p-10 text-center text-fg-muted">
          Selecciona un curso y una materia para ver la lista de estudiantes.
        </div>
      )}

      {asignacionId && loading && <div className="flex justify-center py-8"><Spinner /></div>}

      {asignacionId && !loading && (
        <>
          <div className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-bg text-left text-xs font-semibold uppercase tracking-wide text-fg-muted">
                  <th className="px-4 py-3">Código</th>
                  <th className="px-4 py-3">Apellidos y Nombres</th>
                  <th className="px-4 py-3 text-center w-32">Nota extracurricular</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filas.length === 0 && (
                  <tr><td colSpan={3} className="py-10 text-center text-fg-muted">No hay estudiantes matriculados en este curso.</td></tr>
                )}
                {filas.map(f => {
                  const val = getValor(f.estudiante_id)
                  const modificado = overrides[f.estudiante_id] !== undefined
                  return (
                    <tr key={f.estudiante_id} className="hover:bg-surface-2/60">
                      <td className="px-4 py-2.5">
                        <span className="font-mono text-xs bg-surface-2 px-2 py-1 rounded text-fg">{f.codigo}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="font-medium text-fg">{f.apellido},</span> <span className="text-fg-muted">{f.nombre}</span>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <input
                          type="number"
                          value={val}
                          onChange={e => setValor(f.estudiante_id, e.target.value)}
                          placeholder="—"
                          className={`w-20 rounded border text-center text-sm px-1 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand ${
                            modificado ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/30' : 'border-border'
                          }`}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end">
            <Button onClick={guardar} loading={saving} disabled={!hasChanges}>Guardar notas extracurriculares</Button>
          </div>
        </>
      )}
    </div>
  )
}
