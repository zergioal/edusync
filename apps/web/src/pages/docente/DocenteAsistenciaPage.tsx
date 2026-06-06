import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { Spinner } from '@edusync/ui'

interface AsignacionCard {
  id:            string
  materia:       { nombre: string; campo: { nombre: string } }
  paralelo:      { letra: string; grado: { nombre: string; nivel: { nombre: string } } }
  gestion:       { anno: number }
  n_estudiantes: number
}

const NIVEL_STYLE: Record<string, { border: string; badge: string; title: string }> = {
  INICIAL:    { border: 'border-amber-200',  badge: 'bg-amber-100 text-amber-700',   title: 'text-amber-800'  },
  PRIMARIA:   { border: 'border-sky-200',    badge: 'bg-sky-100 text-sky-700',       title: 'text-sky-800'    },
  SECUNDARIA: { border: 'border-violet-200', badge: 'bg-violet-100 text-violet-700', title: 'text-violet-800' },
}
const NIVEL_DEFAULT = { border: 'border-gray-200', badge: 'bg-gray-100 text-gray-600', title: 'text-gray-800' }

export default function DocenteAsistenciaPage() {
  const navigate = useNavigate()
  const [asignaciones, setAsignaciones] = useState<AsignacionCard[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<AsignacionCard[]>('/asignaciones/mias')
      .then(setAsignaciones)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>

  if (asignaciones.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-gray-900">Asistencia</h1>
        <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white p-12 text-center text-sm text-gray-400">
          No tienes materias asignadas en la gestión activa.
        </div>
      </div>
    )
  }

  // Group by nivel
  const byNivel: Record<string, AsignacionCard[]> = {}
  for (const a of asignaciones) {
    const n = a.paralelo.grado.nivel.nombre
    ;(byNivel[n] ??= []).push(a)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Asistencia de Clase</h1>
        <p className="text-sm text-gray-500 mt-0.5">Selecciona la materia para registrar asistencia</p>
      </div>

      {Object.entries(byNivel).map(([nivel, items]) => {
        const style = NIVEL_STYLE[nivel] ?? NIVEL_DEFAULT
        return (
          <div key={nivel}>
            <h2 className={`mb-3 text-xs font-bold uppercase tracking-widest ${style.title}`}>{nivel}</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {items.map(a => (
                <button
                  key={a.id}
                  onClick={() => navigate(`/dashboard/docente/asistencia/${a.id}`)}
                  className={`group text-left rounded-xl border-2 bg-white p-4 hover:shadow-md transition-all hover:-translate-y-0.5 ${style.border}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[10px] text-gray-400 truncate">{a.materia.campo.nombre}</p>
                      <p className={`font-semibold text-sm leading-tight mt-0.5 ${style.title} group-hover:underline`}>
                        {a.materia.nombre}
                      </p>
                    </div>
                    <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${style.badge}`}>
                      {a.paralelo.grado.nombre.match(/^(\d+°)/)?.[1] ?? a.paralelo.grado.nombre.slice(0, 3)}{' '}
                      {a.paralelo.letra}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
                    <span>👥 {a.n_estudiantes} estudiantes</span>
                    <span className="flex items-center gap-1 text-indigo-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      Pasar lista →
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
