import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { Spinner } from '@edusync/ui'

interface AsignacionCard {
  paralelo: { id: string; letra: string; grado: { nombre: string; nivel: { nombre: string } } }
  n_estudiantes: number
}

const NIVEL_STYLE: Record<string, { border: string; badge: string; title: string }> = {
  INICIAL:    { border: 'border-amber-200',  badge: 'bg-amber-100 text-amber-700',   title: 'text-amber-800'  },
  PRIMARIA:   { border: 'border-sky-200',    badge: 'bg-sky-100 text-sky-700',       title: 'text-sky-800'    },
  SECUNDARIA: { border: 'border-violet-200', badge: 'bg-violet-100 text-violet-700', title: 'text-violet-800' },
}
const NIVEL_DEFAULT = { border: 'border-border', badge: 'bg-surface-2 text-fg-muted', title: 'text-fg' }

export default function ControlDiarioPage() {
  const navigate = useNavigate()
  const [paralelos, setParalelos] = useState<AsignacionCard[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<AsignacionCard[]>('/asignaciones/mias')
      .then(asignaciones => {
        const porParalelo = new Map<string, AsignacionCard>()
        for (const a of asignaciones) porParalelo.set(a.paralelo.id, a)
        setParalelos([...porParalelo.values()])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>

  if (paralelos.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-fg">Control diario</h1>
        <div className="rounded-xl border-2 border-dashed border-border bg-surface p-12 text-center text-sm text-fg-muted">
          No tienes cursos asignados en la gestión activa.
        </div>
      </div>
    )
  }

  const byNivel: Record<string, AsignacionCard[]> = {}
  for (const a of paralelos) {
    const n = a.paralelo.grado.nivel.nombre
    ;(byNivel[n] ??= []).push(a)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-fg">Control diario</h1>
        <p className="text-sm text-fg-muted mt-0.5">Selecciona el curso para anotar observaciones — el cuaderno digital de cada estudiante.</p>
      </div>

      {Object.entries(byNivel).map(([nivel, items]) => {
        const style = NIVEL_STYLE[nivel] ?? NIVEL_DEFAULT
        return (
          <div key={nivel}>
            <h2 className={`mb-3 text-xs font-bold uppercase tracking-widest ${style.title}`}>{nivel}</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {items.map(a => (
                <button
                  key={a.paralelo.id}
                  onClick={() => navigate(`/dashboard/docente/control-diario/${a.paralelo.id}`)}
                  className={`group text-left rounded-xl border-2 bg-surface p-4 hover:shadow-md transition-all hover:-translate-y-0.5 ${style.border}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className={`font-semibold text-sm leading-tight ${style.title} group-hover:underline`}>
                      {a.paralelo.grado.nombre} "{a.paralelo.letra}"
                    </p>
                    <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${style.badge}`}>
                      {nivel.slice(0, 3)}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-fg-muted">
                    <span>👥 {a.n_estudiantes} estudiantes</span>
                    <span className="flex items-center gap-1 text-indigo-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      Abrir cuaderno →
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
