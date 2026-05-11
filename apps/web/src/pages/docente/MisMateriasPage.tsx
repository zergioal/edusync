import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, ApiError } from '../../lib/api'
import { useToast } from '../../components/ui/Toast'
import { Spinner, Badge, Button } from '@edusync/ui'

interface AsignacionCard {
  id:           string
  materia:      { nombre: string; campo: { nombre: string } }
  paralelo:     { letra: string; grado: { nombre: string; nivel: { nombre: string } } }
  gestion:      { anno: number }
  _count:       { indicadores: number }
  n_estudiantes: number
}

const NIVEL_VARIANT: Record<string, 'warning' | 'info' | 'success'> = {
  INICIAL:    'warning',
  PRIMARIA:   'info',
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
        <h1 className="text-2xl font-bold text-gray-900">Mis Materias</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          {asignaciones.length} asignación{asignaciones.length !== 1 ? 'es' : ''} activa{asignaciones.length !== 1 ? 's' : ''}
        </p>
      </div>

      {asignaciones.length === 0 && (
        <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white p-12 text-center">
          <p className="text-gray-400">No tienes materias asignadas en este trimestre.</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {asignaciones.map(a => {
          const nivel   = a.paralelo.grado.nivel.nombre
          const bgColor = NIVEL_COLOR[nivel] ?? 'bg-gray-600'

          return (
            <div
              key={a.id}
              className="flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Franja superior con color del nivel */}
              <div className={`${bgColor} px-5 py-3 flex items-center justify-between`}>
                <span className="text-sm font-semibold text-white">
                  Gestión {a.gestion.anno}
                </span>
                <Badge variant={NIVEL_VARIANT[nivel] ?? 'info'}>{nivel}</Badge>
              </div>

              {/* Contenido */}
              <div className="flex flex-1 flex-col gap-3 p-5">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                    {a.materia.campo.nombre}
                  </p>
                  <h2 className="mt-0.5 text-lg font-bold text-gray-900 leading-tight">
                    {a.materia.nombre}
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700 text-sm">
                    {a.paralelo.letra}
                  </span>
                  <span className="text-sm text-gray-700">
                    {a.paralelo.grado.nombre}
                  </span>
                </div>

                {/* Stats */}
                <div className="mt-auto flex gap-4 border-t border-gray-100 pt-3">
                  <div className="text-center">
                    <p className="text-xl font-bold text-gray-800">{a.n_estudiantes}</p>
                    <p className="text-xs text-gray-400">estudiantes</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-gray-800">{a._count.indicadores}</p>
                    <p className="text-xs text-gray-400">indicadores</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      const isInicial = nivel === 'INICIAL'
                      navigate(isInicial
                        ? `/dashboard/docente/inicial/${a.id}`
                        : `/dashboard/docente/planilla/${a.id}`)
                    }}
                  >
                    {nivel === 'INICIAL' ? 'Observaciones →' : 'Planilla →'}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => navigate(`/dashboard/docente/asistencia/${a.id}`)}
                  >
                    Asistencia
                  </Button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
