import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../../../lib/api'
import { useToast } from '../../../components/ui/Toast'
import { SelectMiCurso } from '../../../components/docente/SelectMiCurso'
import { Icon } from '../../../components/ui/Icon'
import { Spinner } from '@edusync/ui'

interface AsignacionMia {
  id:       string
  materia:  { nombre: string; campo: { nombre: string } }
  paralelo: { id: string }
}

export default function CalificacionesPorCursoPage() {
  const navigate = useNavigate()
  const toast    = useToast()
  const [paraleloId,   setParaleloId]   = useState('')
  const [asignaciones, setAsignaciones] = useState<AsignacionMia[]>([])
  const [loading,      setLoading]      = useState(false)

  useEffect(() => {
    if (!paraleloId) { setAsignaciones([]); return }
    setLoading(true)
    api.get<AsignacionMia[]>('/asignaciones/mias')
      .then(mias => setAsignaciones(mias.filter(a => a.paralelo.id === paraleloId)))
      .catch(() => toast.error('No se pudieron cargar tus materias'))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paraleloId])

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Link to=".." className="text-sm font-medium text-fg-muted hover:text-fg transition-colors flex items-center gap-1">
          <Icon name="arrow-left" className="h-4 w-4" /> Reportes
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-fg">Calificaciones por Curso</h1>
        <p className="text-sm text-fg-muted mt-0.5">Elige uno de tus cursos para ver el centralizador de notas de tu(s) materia(s) ahí.</p>
      </div>

      <div className="rounded-xl border border-border bg-surface p-5">
        <div className="max-w-xs">
          <SelectMiCurso value={paraleloId} onChange={setParaleloId} />
        </div>
      </div>

      {loading && <div className="flex justify-center py-12"><Spinner /></div>}

      {paraleloId && !loading && (
        asignaciones.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-border bg-surface p-10 text-center text-sm text-fg-muted">
            No tienes materias asignadas en este curso.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {asignaciones.map(a => (
              <button
                key={a.id}
                onClick={() => navigate(`/dashboard/docente/planilla/${a.id}/centralizador`)}
                className="flex flex-col items-start gap-1 rounded-xl border border-border bg-surface p-5 text-left shadow-sm hover:shadow-md hover:border-brand transition-all"
              >
                <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">{a.materia.campo.nombre}</p>
                <h2 className="text-lg font-bold text-fg leading-tight">{a.materia.nombre}</h2>
                <div className="mt-2 flex items-center gap-1.5 text-sm text-brand">
                  <Icon name="document-list" className="h-4 w-4" />
                  Ver centralizador
                </div>
              </button>
            ))}
          </div>
        )
      )}
    </div>
  )
}
