import { useState, useEffect } from 'react'
import { api, apiDownload } from '../../lib/api'
import { Spinner, Badge } from '@edusync/ui'
import { ExportarButton } from '../ui/ExportarButton'

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

/** Tabla + exportar del centralizador de subáreas — compartida entre la vista del
 *  docente (CentralizadorSubareasPage) y la de staff (CentralizadorSubareasStaffPage),
 *  que solo difieren en el encabezado/botón de volver alrededor de esto. */
export function CentralizadorSubareasTabla({ asignacionId, trimestreId }: { asignacionId: string; trimestreId: string }) {
  const [data,    setData]    = useState<CentralizadorSubareasData | null>(null)
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(true)
  const [dlState, setDlState] = useState<'idle' | 'pdf' | 'xlsx'>('idle')

  useEffect(() => {
    if (!trimestreId) { setError('Selecciona un trimestre en la planilla antes de abrir el centralizador'); setLoading(false); return }
    setLoading(true)
    setError('')
    api.get<CentralizadorSubareasData>(`/planilla/${asignacionId}/subareas?trimestre_id=${trimestreId}`)
      .then(setData)
      .catch(e => setError(e?.message ?? 'Error al cargar el centralizador de subáreas'))
      .finally(() => setLoading(false))
  }, [asignacionId, trimestreId])

  async function exportar(tipo: 'pdf' | 'xlsx') {
    setDlState(tipo)
    try {
      await apiDownload(
        `/planilla/${asignacionId}/subareas/${tipo === 'pdf' ? 'pdf' : 'excel'}?trimestre_id=${trimestreId}`,
        `centralizador_subareas.${tipo === 'pdf' ? 'pdf' : 'xlsx'}`,
      )
    } finally {
      setDlState('idle')
    }
  }

  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>
  if (error)   return <div className="rounded-lg bg-red-50 dark:bg-red-950/40 p-3 text-sm text-red-700 dark:text-red-400">{error}</div>
  if (!data)   return null

  return (
    <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-semibold text-fg">{data.area_padre}</div>
          <p className="text-sm text-fg-muted mt-1">
            Promedio combinado de todas las subáreas — así repercute la nota en el boletín del estudiante.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {data.subareas.map(s => (
              <Badge key={s.asignacion_id} variant={s.es_esta ? 'success' : 'info'}>
                {s.nombre} · {s.docente}{s.es_esta ? ' (tú)' : ''}
              </Badge>
            ))}
          </div>
        </div>
        <ExportarButton disabled={data.estudiantes.length === 0} dlState={dlState} onExport={exportar} align="right" />
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
  )
}
