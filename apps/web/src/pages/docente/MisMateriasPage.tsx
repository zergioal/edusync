import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, ApiError } from '../../lib/api'
import { useToast } from '../../components/ui/Toast'
import { Icon } from '../../components/ui/Icon'
import { Spinner, Badge } from '@edusync/ui'

interface AsignacionCard {
  id:           string
  materia:      {
    nombre:           string
    campo:            { nombre: string }
    es_subarea_de_id: string | null
    parent_materia:   { nombre: string } | null
  }
  paralelo:     { id: string; letra: string; grado: { nombre: string; nivel: { nombre: string } } }
  gestion:      { anno: number }
  _count:       { indicadores: number }
  n_estudiantes: number
}

const NIVEL_VARIANT: Record<string, 'warning' | 'info' | 'success'> = {
  INICIAL: 'warning',
  PRIMARIA: 'info',
  SECUNDARIA: 'success',
}

const NIVEL_COLOR: Record<string, string> = {
  INICIAL:    'bg-amber-600',
  PRIMARIA:   'bg-blue-600',
  SECUNDARIA: 'bg-emerald-600',
}

export default function MisMateriasPage() {
  const toast    = useToast()
  const toastRef = useRef(toast)
  toastRef.current = toast
  const navigate = useNavigate()

  const [asignaciones, setAsignaciones] = useState<AsignacionCard[]>([])
  const [loading,      setLoading]      = useState(true)

  useEffect(() => {
    api.get<AsignacionCard[]>('/asignaciones/mias')
      .then(setAsignaciones)
      .catch(err => toastRef.current.error(err instanceof ApiError ? err.message : 'Error al cargar materias'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="flex justify-center py-16"><Spinner /></div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-fg">Mis Materias</h1>
        <p className="mt-0.5 text-sm text-fg-muted">
          {asignaciones.length} asignación{asignaciones.length !== 1 ? 'es' : ''} activa{asignaciones.length !== 1 ? 's' : ''}
        </p>
      </div>

      {asignaciones.length === 0 && (
        <div className="rounded-xl border-2 border-dashed border-border bg-surface p-12 text-center">
          <p className="text-fg-muted">No tienes materias asignadas en este trimestre.</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {asignaciones.map(a => {
          const nivel     = a.paralelo.grado.nivel.nombre
          const bgColor   = NIVEL_COLOR[nivel] ?? 'bg-gray-600'
          const isInicial = nivel === 'INICIAL'
          const esSubarea = a.materia.es_subarea_de_id !== null

          return (
            <div
              key={a.id}
              className="flex flex-col rounded-xl border border-border bg-surface shadow-sm overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Franja superior con color del nivel */}
              <div className={`${bgColor} px-5 py-3 flex items-center justify-between`}>
                <span className="text-sm font-semibold text-white">
                  {nivel} · Gestión {a.gestion.anno}
                </span>
                <Badge variant={NIVEL_VARIANT[nivel] ?? 'info'}>
                  {a.paralelo.grado.nombre} "{a.paralelo.letra}"
                </Badge>
              </div>

              {/* Contenido */}
              <div className="flex flex-1 flex-col gap-3 p-5">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">
                    {a.materia.campo.nombre}
                  </p>
                  <h2 className="mt-0.5 text-lg font-bold text-fg leading-tight">
                    {a.materia.nombre}
                  </h2>
                  <p className="mt-0.5 text-xs text-fg-muted">
                    {esSubarea
                      ? `Subárea de ${a.materia.parent_materia?.nombre ?? '—'}`
                      : 'Área'}
                  </p>
                </div>

                {/* Stats */}
                <div className="mt-auto flex gap-5 border-t border-border pt-3">
                  <div className="flex items-center gap-1.5 text-fg-muted">
                    <Icon name="users" className="h-4 w-4" />
                    <span className="text-sm font-semibold text-fg">{a.n_estudiantes}</span>
                    <span className="text-xs">estudiantes</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-fg-muted">
                    <Icon name="document-list" className="h-4 w-4" />
                    <span className="text-sm font-semibold text-fg">{a._count.indicadores}</span>
                    <span className="text-xs">indicadores</span>
                  </div>
                </div>

                {/* Acciones */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => navigate(isInicial
                      ? `/dashboard/docente/inicial/${a.id}`
                      : `/dashboard/docente/planilla/${a.id}`)}
                    className="flex flex-col items-center gap-1 rounded-lg bg-indigo-600 px-2 py-2.5 text-white transition-colors hover:bg-indigo-700"
                  >
                    <Icon name="clipboard-check" className="h-5 w-5" />
                    <span className="text-xs font-semibold leading-none">
                      {isInicial ? 'Observ.' : 'Planilla'}
                    </span>
                  </button>
                  <button
                    onClick={() => navigate(`/dashboard/docente/asistencia/${a.id}`)}
                    className="flex flex-col items-center gap-1 rounded-lg bg-sky-600 px-2 py-2.5 text-white transition-colors hover:bg-sky-700"
                  >
                    <Icon name="calendar-check" className="h-5 w-5" />
                    <span className="text-xs font-semibold leading-none">Asistencia</span>
                  </button>
                  <button
                    onClick={() => navigate(`/dashboard/docente/control-diario/${a.paralelo.id}`)}
                    className="flex flex-col items-center gap-1 rounded-lg bg-violet-600 px-2 py-2.5 text-white transition-colors hover:bg-violet-700"
                  >
                    <Icon name="notebook" className="h-5 w-5" />
                    <span className="text-xs font-semibold leading-none">C. Diario</span>
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
