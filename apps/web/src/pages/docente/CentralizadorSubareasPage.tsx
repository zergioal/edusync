import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../../lib/api'
import { Spinner, Badge } from '@edusync/ui'

interface NotaSubarea { asignacion_id: string; materia_id: string; nombre: string; total: number | null }

interface EstudianteCentralizador {
  id:            string
  codigo:        string
  apellido:      string
  nombre:        string
  notasSubareas: NotaSubarea[]
  promedio:      number | null
}

interface SubareaInfo { asignacion_id: string; nombre: string; docente: string; es_esta: boolean }

interface CentralizadorSubareasData {
  area_padre:  string
  subareas:    SubareaInfo[]
  estudiantes: EstudianteCentralizador[]
}

export default function CentralizadorSubareasPage() {
  const { asignacion_id } = useParams<{ asignacion_id: string }>()
  const [searchParams] = useSearchParams()
  const trimestre_id = searchParams.get('trimestre_id') ?? ''
  const navigate = useNavigate()

  const [data,    setData]    = useState<CentralizadorSubareasData | null>(null)
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!trimestre_id) { setError('Selecciona un trimestre en la planilla antes de abrir el centralizador'); setLoading(false); return }
    api.get<CentralizadorSubareasData>(`/planilla/${asignacion_id}/subareas?trimestre_id=${trimestre_id}`)
      .then(setData)
      .catch(e => setError(e?.message ?? 'Error al cargar el centralizador de subáreas'))
      .finally(() => setLoading(false))
  }, [asignacion_id, trimestre_id])

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-sm text-brand hover:underline">← Volver al registro</button>
        <h1 className="text-xl font-bold text-fg">📚 Subáreas del área</h1>
      </div>

      {loading && <div className="flex justify-center py-16"><Spinner /></div>}
      {error   && <div className="rounded-lg bg-red-50 dark:bg-red-950/40 p-3 text-sm text-red-700 dark:text-red-400">{error}</div>}

      {data && !loading && (
        <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
          <div>
            <div className="font-semibold text-fg">{data.area_padre}</div>
            <p className="text-sm text-fg-muted mt-1">
              Promedio combinado de todas las subáreas — así repercute tu nota en el boletín del estudiante.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {data.subareas.map(s => (
                <Badge key={s.asignacion_id} variant={s.es_esta ? 'success' : 'info'}>
                  {s.nombre} · {s.docente}{s.es_esta ? ' (tú)' : ''}
                </Badge>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-2 text-left text-xs font-semibold uppercase tracking-wide text-fg-muted">
                  <th className="px-4 py-2.5">Estudiante</th>
                  {data.subareas.map(s => (
                    <th key={s.asignacion_id} className="px-3 py-2.5 text-center">{s.nombre}</th>
                  ))}
                  <th className="px-4 py-2.5 text-center bg-surface-2">Promedio combinado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.estudiantes.map(est => (
                  <tr key={est.id} className="hover:bg-surface-2/60">
                    <td className="px-4 py-2.5">
                      <span className="font-medium text-fg">{est.apellido},</span>{' '}
                      <span className="text-fg-muted">{est.nombre}</span>
                    </td>
                    {est.notasSubareas.map(n => (
                      <td key={n.asignacion_id} className="px-3 py-2.5 text-center">
                        {n.total != null ? <span className="font-semibold text-fg">{n.total}</span> : <span className="text-fg-muted/50">—</span>}
                      </td>
                    ))}
                    <td className="px-4 py-2.5 text-center font-bold bg-surface-2">
                      {est.promedio != null ? est.promedio : <span className="text-fg-muted/50">—</span>}
                    </td>
                  </tr>
                ))}
                {data.estudiantes.length === 0 && (
                  <tr>
                    <td colSpan={2 + data.subareas.length} className="py-8 text-center text-fg-muted">
                      No hay estudiantes matriculados en este paralelo.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
