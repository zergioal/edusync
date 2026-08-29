import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { Spinner } from '@edusync/ui'

type Categoria =
  | 'NO_ENTREGO_TAREA' | 'FALTO' | 'SALIO_SIN_PERMISO'
  | 'NO_RINDIO_EVALUACION' | 'CITACION_AGENDA' | 'INDISCIPLINA' | 'NO_TRABAJA_EN_CLASE' | 'OTRO'

interface Observacion {
  id:        string
  categoria: Categoria
  detalle:   string | null
  fecha:     string
  docente:   { usuario: { nombre: string; apellido: string } }
  paralelo:  { letra: string; grado: { nombre: string } }
  asignacion: { materia: { nombre: string } } | null
}

const CATEGORIA_CFG: Record<Categoria, { label: string; badge: string }> = {
  NO_ENTREGO_TAREA:     { label: 'No entregó tarea',        badge: 'bg-amber-100 text-amber-700' },
  FALTO:                { label: 'Faltó',                   badge: 'bg-red-100 text-red-700' },
  SALIO_SIN_PERMISO:    { label: 'Salió sin permiso',       badge: 'bg-orange-100 text-orange-700' },
  NO_RINDIO_EVALUACION: { label: 'No rindió evaluación',    badge: 'bg-purple-100 text-purple-700' },
  CITACION_AGENDA:      { label: 'Citación en agenda',      badge: 'bg-blue-100 text-blue-700' },
  INDISCIPLINA:         { label: 'Indisciplina',            badge: 'bg-rose-100 text-rose-700' },
  NO_TRABAJA_EN_CLASE:  { label: 'No trabaja en clase',     badge: 'bg-teal-100 text-teal-700' },
  OTRO:                 { label: 'Observación',             badge: 'bg-surface-2 text-fg-muted' },
}

function fmtFecha(s: string) {
  return new Date(s).toLocaleDateString('es-BO', { weekday: 'long', day: 'numeric', month: 'long' })
}

interface Props { estudianteId?: string }

export default function MiControlDiarioPage({ estudianteId }: Props) {
  const [observaciones, setObservaciones] = useState<Observacion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const path = estudianteId ? `/observaciones-diarias/hijo/${estudianteId}` : '/observaciones-diarias/mia'
    setLoading(true)
    setError(null)
    api.get<Observacion[]>(path)
      .then(setObservaciones)
      .catch(() => setError('No se pudo cargar el control diario'))
      .finally(() => setLoading(false))
  }, [estudianteId])

  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>
  if (error) return <div className="text-center py-16 text-red-500 text-sm">{error}</div>

  // Agrupar por fecha (ya viene ordenado desc desde el backend)
  const grupos: { fecha: string; items: Observacion[] }[] = []
  for (const o of observaciones) {
    const ultimo = grupos[grupos.length - 1]
    if (ultimo && ultimo.fecha === o.fecha) ultimo.items.push(o)
    else grupos.push({ fecha: o.fecha, items: [o] })
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-fg">{estudianteId ? 'Control diario' : 'Mi Control Diario'}</h1>
        <p className="text-sm text-fg-muted mt-0.5">Observaciones registradas por los profesores, de todas las materias.</p>
      </div>

      {grupos.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-border bg-surface p-10 text-center text-sm text-fg-muted">
          Sin observaciones registradas.
        </div>
      ) : (
        <div className="space-y-5">
          {grupos.map(g => (
            <div key={g.fecha}>
              <h2 className="text-xs font-bold uppercase tracking-wide text-fg-muted mb-2 capitalize">
                {fmtFecha(g.fecha)}
              </h2>
              <div className="space-y-2">
                {g.items.map(o => {
                  const cfg = CATEGORIA_CFG[o.categoria]
                  return (
                    <div key={o.id} className="rounded-xl border border-border bg-surface p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.badge}`}>
                          {cfg.label}
                        </span>
                        <span className="text-xs text-fg-muted">
                          {o.paralelo.grado.nombre} "{o.paralelo.letra}"
                          {o.asignacion && <> · {o.asignacion.materia.nombre}</>}
                        </span>
                      </div>
                      {o.detalle && <p className="text-sm text-fg mt-2">{o.detalle}</p>}
                      <p className="text-xs text-fg-muted mt-2">
                        {o.docente.usuario.nombre} {o.docente.usuario.apellido}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
