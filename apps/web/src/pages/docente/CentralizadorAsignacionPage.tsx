import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api, apiDownload } from '../../lib/api'
import { Spinner } from '@edusync/ui'

type Escala = 'ED' | 'DA' | 'DO' | 'DP'

interface EstudianteCentralizador {
  id:          string
  nombre:      string
  apellido:    string
  codigo:      string
  totales:     Record<string, number | null>
  escalas:     Record<string, Escala | null>
  observacion: string
}

interface CentralizadorAsignacionData {
  asignacion: {
    materia:  { nombre: string }
    paralelo: { letra: string; grado: { nombre: string; nivel: { nombre: string } } }
    gestion:  { anno: number }
  }
  trimestres:  Array<{ id: string; numero: number }>
  meta:        number
  estudiantes: EstudianteCentralizador[]
}

const ESCALA_COLORS: Record<Escala, string> = {
  ED: 'text-rose-600 dark:text-rose-400',
  DA: 'text-amber-600 dark:text-amber-400',
  DO: 'text-blue-600 dark:text-blue-400',
  DP: 'text-emerald-600 dark:text-emerald-400',
}

export default function CentralizadorAsignacionPage() {
  const { asignacion_id } = useParams<{ asignacion_id: string }>()
  const navigate = useNavigate()

  const [data,    setData]    = useState<CentralizadorAsignacionData | null>(null)
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(true)
  const [dlState, setDlState] = useState<'idle' | 'pdf' | 'xlsx'>('idle')

  useEffect(() => {
    api.get<CentralizadorAsignacionData>(`/planilla/${asignacion_id}/centralizador`)
      .then(setData)
      .catch(e => setError(e?.message ?? 'Error al cargar el centralizador'))
      .finally(() => setLoading(false))
  }, [asignacion_id])

  async function descargar(tipo: 'pdf' | 'xlsx') {
    if (!data) return
    setDlState(tipo)
    try {
      const ext = tipo === 'pdf' ? 'pdf' : 'xlsx'
      await apiDownload(
        `/planilla/${asignacion_id}/centralizador/${tipo === 'pdf' ? 'pdf' : 'excel'}`,
        `centralizador_${data.asignacion.materia.nombre}.${ext}`,
      )
    } finally { setDlState('idle') }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-sm text-brand hover:underline">← Volver al registro</button>
        <h1 className="text-xl font-bold text-fg">📊 Centralizador de la materia</h1>
      </div>

      {loading && <div className="flex justify-center py-16"><Spinner /></div>}
      {error   && <div className="rounded-lg bg-red-50 dark:bg-red-950/40 p-3 text-sm text-red-700 dark:text-red-400">{error}</div>}

      {data && !loading && (
        <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="font-semibold text-fg">
                {data.asignacion.materia.nombre} — {data.asignacion.paralelo.grado.nivel.nombre} {data.asignacion.paralelo.grado.nombre} "{data.asignacion.paralelo.letra}"
              </div>
              <div className="text-sm text-fg-muted">Gestión {data.asignacion.gestion.anno}</div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => descargar('pdf')}
                disabled={dlState !== 'idle'}
                className="rounded-lg border border-blue-600 px-3 py-1.5 text-sm text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 disabled:opacity-50"
              >
                {dlState === 'pdf' ? '…' : '📄 PDF'}
              </button>
              <button
                onClick={() => descargar('xlsx')}
                disabled={dlState !== 'idle'}
                className="rounded-lg border border-green-600 px-3 py-1.5 text-sm text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/30 disabled:opacity-50"
              >
                {dlState === 'xlsx' ? '…' : '📗 Excel'}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-2 text-left text-xs font-semibold uppercase tracking-wide text-fg-muted">
                  <th className="px-4 py-2.5">Estudiante</th>
                  {data.trimestres.map(t => (
                    <th key={t.id} className="px-3 py-2.5 text-center">{t.numero}° T</th>
                  ))}
                  <th className="px-4 py-2.5">Observaciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.estudiantes.map(est => (
                  <tr key={est.id} className="hover:bg-surface-2/60">
                    <td className="px-4 py-2.5">
                      <span className="font-medium text-fg">{est.apellido},</span>{' '}
                      <span className="text-fg-muted">{est.nombre}</span>
                    </td>
                    {data.trimestres.map(t => {
                      const total  = est.totales[t.id]
                      const escala = est.escalas[t.id]
                      return (
                        <td key={t.id} className="px-3 py-2.5 text-center">
                          {total != null ? (
                            <span className={`font-semibold ${escala ? ESCALA_COLORS[escala] : 'text-fg'}`}>{total}</span>
                          ) : (
                            <span className="text-fg-muted/50">—</span>
                          )}
                        </td>
                      )
                    })}
                    <td className="px-4 py-2.5 text-xs text-fg-muted">{est.observacion}</td>
                  </tr>
                ))}
                {data.estudiantes.length === 0 && (
                  <tr>
                    <td colSpan={2 + data.trimestres.length} className="py-8 text-center text-fg-muted">
                      No hay estudiantes matriculados en este paralelo.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-fg-muted">
            Mínimo para aprobar la gestión: {data.meta} pts acumulados en los {data.trimestres.length} trimestres.
          </p>
        </div>
      )}
    </div>
  )
}
