import { useState, useEffect, useRef, useCallback, Fragment } from 'react'
import { api, ApiError } from '../../lib/api'
import { useToast } from '../ui/Toast'
import { Button, Spinner } from '@edusync/ui'

interface Nivel  { id: string; nombre: string }
interface Grado  { id: string; nombre: string; orden: number }
interface Subarea {
  id:    string
  nombre: string
  campo: { nombre: string }
  carga_horaria: { grado: { id: string }; horas_mes: number }[]
}
interface Materia extends Subarea {
  subareas: Subarea[]
}
interface CargaData { grados: Grado[]; materias: Materia[] }

/** Carga horaria por materia y grado — self-contenido, trae sus propios niveles.
 *  Usado en Configuración (Admin) y en el panel de Director. */
export function SeccionCargaHoraria() {
  const toast    = useToast()
  const toastRef = useRef(toast)
  toastRef.current = toast

  const [niveles,   setNiveles]   = useState<Nivel[]>([])
  const [nivelId,   setNivelId]   = useState('')
  const [carga,     setCarga]     = useState<CargaData | null>(null)
  const [loading,   setLoading]   = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [overrides, setOverrides] = useState<Record<string, Record<string, number>>>({})

  useEffect(() => {
    api.get<Nivel[]>('/niveles')
      .then(data => { setNiveles(data); if (data[0]) setNivelId(data[0].id) })
      .catch(() => toastRef.current.error('Error cargando niveles'))
  }, [])

  const load = useCallback(async (id: string) => {
    if (!id) return
    setLoading(true)
    setOverrides({})
    try {
      setCarga(await api.get<CargaData>(`/materias/carga-horaria?nivel_id=${id}`))
    } catch {
      toastRef.current.error('Error cargando carga horaria')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(nivelId) }, [nivelId, load])

  // Lista plana de todas las filas (áreas + sus subáreas), para totales y guardado.
  const todasFilas = (carga?.materias ?? []).flatMap(m => [m as Subarea, ...m.subareas])

  const getHoras = (materia_id: string, grado_id: string): number => {
    const ov = overrides[materia_id]?.[grado_id]
    if (ov !== undefined) return ov
    const mat = todasFilas.find(m => m.id === materia_id)
    return mat?.carga_horaria.find(c => c.grado.id === grado_id)?.horas_mes ?? 0
  }

  const setHoras = (materia_id: string, grado_id: string, val: number) => {
    setOverrides(prev => ({
      ...prev,
      [materia_id]: { ...(prev[materia_id] ?? {}), [grado_id]: val },
    }))
  }

  // Totales en vivo — se recalculan en cada render a partir de getHoras(), que ya
  // combina overrides sin guardar con los valores originales.
  const rowTotal = (materia_id: string): number =>
    (carga?.grados ?? []).reduce((s, g) => s + getHoras(materia_id, g.id), 0)

  const colTotal = (grado_id: string): number =>
    todasFilas.reduce((s, m) => s + getHoras(m.id, grado_id), 0)

  const grandTotal = (): number =>
    todasFilas.reduce((s, m) => s + rowTotal(m.id), 0)

  const save = async () => {
    if (!carga) return
    const entries: { materia_id: string; grado_id: string; horas_mes: number }[] = []
    for (const mat of todasFilas) {
      for (const grado of carga.grados) {
        entries.push({ materia_id: mat.id, grado_id: grado.id, horas_mes: getHoras(mat.id, grado.id) })
      }
    }
    setSaving(true)
    try {
      await api.put('/materias/carga-horaria', entries)
      toastRef.current.success('Carga horaria guardada')
      setOverrides({})
      load(nivelId)
    } catch (err) {
      toastRef.current.error(err instanceof ApiError ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const hasChanges = Object.keys(overrides).length > 0

  if (niveles.length === 0) {
    return <p className="text-sm text-fg-muted">No hay niveles configurados.</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        {niveles.map(n => (
          <button
            key={n.id}
            type="button"
            onClick={() => setNivelId(n.id)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              nivelId === n.id
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-surface-2 text-fg-muted hover:bg-surface-2'
            }`}
          >
            {n.nombre}
          </button>
        ))}
      </div>

      {loading && <div className="flex justify-center py-8"><Spinner /></div>}

      {!loading && carga && (
        <>
          <div className="overflow-x-auto rounded-xl border border-border bg-surface shadow-sm">
            <table className="text-sm">
              <thead>
                <tr className="border-b border-border bg-bg">
                  <th className="sticky left-0 bg-bg px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-fg-muted min-w-[200px]">
                    Materia
                  </th>
                  {carga.grados.map(g => (
                    <th key={g.id} className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-fg-muted min-w-[80px]">
                      {g.nombre}
                    </th>
                  ))}
                  <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-fg-muted min-w-[100px] bg-surface-2">
                    Total por área
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {carga.materias.map(mat => (
                  <Fragment key={mat.id}>
                    <tr className="hover:bg-surface-2">
                      <td className="sticky left-0 bg-surface px-4 py-2.5 font-medium text-fg hover:bg-surface-2">
                        <span>{mat.nombre}</span>
                        <span className="ml-2 text-xs text-fg-muted">{mat.campo.nombre}</span>
                      </td>
                      {carga.grados.map(g => {
                        const h  = getHoras(mat.id, g.id)
                        const ov = overrides[mat.id]?.[g.id] !== undefined
                        return (
                          <td key={g.id} className="px-2 py-1.5 text-center">
                            <input
                              type="number" min={0} max={999}
                              value={h}
                              onChange={e => setHoras(mat.id, g.id, parseInt(e.target.value) || 0)}
                              className={`w-16 rounded border text-center text-sm px-1 py-1 focus:outline-none focus:ring-1 focus:ring-brand ${
                                ov ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/30' : 'border-border'
                              }`}
                            />
                          </td>
                        )
                      })}
                      <td className="px-3 py-2.5 text-center font-semibold text-fg bg-surface-2">
                        {rowTotal(mat.id)}
                      </td>
                    </tr>
                    {mat.subareas.map(sub => (
                      <tr key={sub.id} className="bg-surface-2/40 hover:bg-surface-2">
                        <td className="sticky left-0 bg-surface-2/40 px-4 py-2 pl-8 text-fg-muted hover:bg-surface-2">
                          <span className="text-fg-muted">↳ </span>
                          <span className="text-fg">{sub.nombre}</span>
                        </td>
                        {carga.grados.map(g => {
                          const h  = getHoras(sub.id, g.id)
                          const ov = overrides[sub.id]?.[g.id] !== undefined
                          return (
                            <td key={g.id} className="px-2 py-1.5 text-center">
                              <input
                                type="number" min={0} max={999}
                                value={h}
                                onChange={e => setHoras(sub.id, g.id, parseInt(e.target.value) || 0)}
                                className={`w-16 rounded border text-center text-sm px-1 py-1 focus:outline-none focus:ring-1 focus:ring-brand ${
                                  ov ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/30' : 'border-border'
                                }`}
                              />
                            </td>
                          )
                        })}
                        <td className="px-3 py-2.5 text-center font-semibold text-fg bg-surface-2">
                          {rowTotal(sub.id)}
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-bg font-semibold">
                  <td className="sticky left-0 bg-bg px-4 py-2.5 text-fg text-xs uppercase tracking-wide">
                    Total por año de escolaridad
                  </td>
                  {carga.grados.map(g => (
                    <td key={g.id} className="px-3 py-2.5 text-center text-fg">
                      {colTotal(g.id)}
                    </td>
                  ))}
                  <td className="px-3 py-2.5 text-center text-fg bg-surface-2">
                    {grandTotal()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="flex justify-end">
            <Button onClick={save} loading={saving} disabled={!hasChanges}>
              Guardar carga horaria
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
