import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { Spinner, Badge } from '@edusync/ui'

interface Tarea {
  id:            string
  titulo:        string
  descripcion:   string | null
  fecha_entrega: string
  asignacion:    { materia: { nombre: string } }
}

function diasRestantes(fecha: string): number {
  return Math.ceil((new Date(fecha).getTime() - Date.now()) / 86400000)
}

export default function MisTareasPage() {
  const [tareas,  setTareas]  = useState<Tarea[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<Tarea[]>('/tareas/mis-tareas')
      .then(setTareas)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>

  // Agrupar por materia
  const materias = Array.from(new Set(tareas.map(t => t.asignacion.materia.nombre)))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mis Tareas</h1>
        <p className="text-sm text-gray-500 mt-0.5">Tareas asignadas por tus docentes</p>
      </div>

      {tareas.length === 0 ? (
        <div className="rounded-xl border border-gray-100 bg-white px-5 py-12 text-center text-sm text-gray-400 shadow-sm">
          No hay tareas pendientes
        </div>
      ) : (
        materias.map(materia => {
          const t = tareas.filter(t => t.asignacion.materia.nombre === materia)
            .sort((a, b) => a.fecha_entrega.localeCompare(b.fecha_entrega))
          return (
            <div key={materia}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">{materia}</h2>
              <div className="space-y-2">
                {t.map(tarea => {
                  const dias = diasRestantes(tarea.fecha_entrega)
                  return (
                    <div key={tarea.id} className={`rounded-xl border bg-white p-4 shadow-sm ${
                      dias < 0 ? 'border-red-200' : dias <= 2 ? 'border-amber-200' : 'border-gray-200'
                    }`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900">{tarea.titulo}</p>
                          {tarea.descripcion && (
                            <p className="mt-0.5 text-sm text-gray-500">{tarea.descripcion}</p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <Badge variant={dias < 0 ? 'danger' : dias <= 2 ? 'warning' : 'success'}>
                            {dias < 0 ? 'Vencida' : dias === 0 ? 'Hoy' : `${dias}d`}
                          </Badge>
                          <span className="text-xs text-gray-400">
                            {new Date(tarea.fecha_entrega).toLocaleDateString('es-BO')}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
