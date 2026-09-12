import { useState, useEffect } from 'react'
import { api } from '../../lib/api'

type EstadoDefensa = 'PENDIENTE' | 'APROBADO' | 'NO_APROBADO'

interface Proyecto {
  nombre:            string
  porcentaje_avance: number
  estado_defensa:    EstadoDefensa
  estudiantes:       { estudiante: { id: string; usuario: { nombre: string; apellido: string } } }[]
}

const ESTADO_LABEL: Record<EstadoDefensa, string> = {
  PENDIENTE: 'Aún no se defendió', APROBADO: 'Aprobado', NO_APROBADO: 'No aprobado',
}
const ESTADO_COLOR: Record<EstadoDefensa, string> = {
  PENDIENTE:   'bg-surface-2 text-fg-muted',
  APROBADO:    'bg-green-100 text-green-700',
  NO_APROBADO: 'bg-red-100 text-red-700',
}

interface Props { estudianteId?: string }

export default function MiProyectoBTHPage({ estudianteId }: Props) {
  const [proyecto, setProyecto] = useState<Proyecto | null | undefined>(undefined) // undefined = cargando
  const [error,    setError]    = useState<string | null>(null)

  useEffect(() => {
    const url = estudianteId ? `/proyectos-bth/hijo/${estudianteId}` : '/proyectos-bth/mi-proyecto'
    api.get<Proyecto | null>(url)
      .then(setProyecto)
      .catch(() => setError('No se pudo cargar la información del proyecto'))
  }, [estudianteId])

  return (
    <div className="space-y-5 max-w-2xl">
      <h1 className="text-2xl font-bold text-fg">Proyecto BTH</h1>

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {proyecto === undefined && !error && (
        <div className="rounded-xl border border-border bg-surface p-8 text-center text-fg-muted">Cargando…</div>
      )}

      {proyecto === null && (
        <div className="rounded-xl border-2 border-dashed border-border bg-surface p-8 text-center">
          <p className="text-fg-muted">
            No hay ningún proyecto BTH asignado — solo estudiantes de 6to de Secundaria que cursan la técnica especializada
            pueden tener un proyecto.
          </p>
        </div>
      )}

      {proyecto && (
        <div className="rounded-xl border border-border bg-surface p-6 space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted">Proyecto</p>
            <h2 className="text-xl font-bold text-fg mt-0.5">{proyecto.nombre}</h2>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted mb-1.5">Equipo</p>
            <div className="flex flex-wrap gap-1.5">
              {proyecto.estudiantes.map(e => (
                <span key={e.estudiante.id} className="inline-block rounded-full bg-surface-2 px-3 py-1 text-sm text-fg">
                  {e.estudiante.usuario.apellido}, {e.estudiante.usuario.nombre}
                </span>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted">Avance</p>
              <span className="text-sm font-bold text-fg">{proyecto.porcentaje_avance}%</span>
            </div>
            <div className="h-3 w-full rounded-full bg-surface-2 overflow-hidden">
              <div
                className="h-full rounded-full bg-brand transition-all"
                style={{ width: `${proyecto.porcentaje_avance}%` }}
              />
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted mb-1.5">Estado de la defensa</p>
            <span className={`inline-block rounded-full px-3 py-1 text-sm font-semibold ${ESTADO_COLOR[proyecto.estado_defensa]}`}>
              {ESTADO_LABEL[proyecto.estado_defensa]}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
