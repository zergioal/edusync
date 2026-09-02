import { useState, useEffect, useRef } from 'react'
import { api, ApiError } from '../../lib/api'
import { useToast } from '../../components/ui/Toast'
import { Spinner, Badge } from '@edusync/ui'
import { Icon } from '../../components/ui/Icon'

interface AsignacionInfo {
  id:        string
  materia:   { id: string; nombre: string; campo: { nombre: string } }
  paralelo:  { letra: string; grado: { nombre: string; nivel: { nombre: string } } }
  gestion:   { anno: number }
  horas_mes: number
}

interface CursoAsesor {
  letra: string
  grado: { nombre: string; nivel: { nombre: string } }
}

interface AreaResumen {
  materiaId:    string
  materia:      string
  campo:        string
  nivel:        string
  horasMesCurso: number
  cursos:       string[]
  horasTotales: number
}

const NIVEL_COLOR: Record<string, string> = {
  INICIAL:    'bg-amber-600',
  PRIMARIA:   'bg-blue-600',
  SECUNDARIA: 'bg-emerald-600',
}

export default function MisAreasPage() {
  const toast    = useToast()
  const toastRef = useRef(toast)
  toastRef.current = toast

  const [asignaciones, setAsignaciones] = useState<AsignacionInfo[]>([])
  const [cursosAsesor, setCursosAsesor] = useState<CursoAsesor[]>([])
  const [loading,      setLoading]      = useState(true)
  const [gestionAnno,  setGestionAnno]  = useState<number | null>(null)

  useEffect(() => {
    Promise.all([
      api.get<AsignacionInfo[]>('/asignaciones/mias'),
      api.get<CursoAsesor[]>('/asignaciones/mis-cursos-asesor'),
    ])
      .then(([asig, asesor]) => {
        setAsignaciones(asig)
        setGestionAnno(asig[0]?.gestion.anno ?? null)
        setCursosAsesor(asesor)
      })
      .catch(err => toastRef.current.error(err instanceof ApiError ? err.message : 'Error al cargar materias'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>

  // Agrupar por materia (área curricular) — sumando horas por cada curso donde se dicta.
  const porMateria = new Map<string, AreaResumen>()
  for (const a of asignaciones) {
    const cursoLabel = `${a.paralelo.grado.nombre} "${a.paralelo.letra}"`
    const existente   = porMateria.get(a.materia.id)
    if (existente) {
      existente.cursos.push(cursoLabel)
      existente.horasTotales += a.horas_mes
    } else {
      porMateria.set(a.materia.id, {
        materiaId:     a.materia.id,
        materia:       a.materia.nombre,
        campo:         a.materia.campo.nombre,
        nivel:         a.paralelo.grado.nivel.nombre,
        horasMesCurso: a.horas_mes,
        cursos:        [cursoLabel],
        horasTotales:  a.horas_mes,
      })
    }
  }
  const areas      = [...porMateria.values()].sort((a, b) => a.materia.localeCompare(b.materia))
  const totalHoras = areas.reduce((s, a) => s + a.horasTotales, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-fg">Mis Materias</h1>
          <p className="mt-0.5 text-sm text-fg-muted">
            {areas.length} área{areas.length !== 1 ? 's' : ''} asignada{areas.length !== 1 ? 's' : ''}
            {gestionAnno ? ` · Gestión ${gestionAnno}` : ''}
          </p>
        </div>
        <div className="rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 px-5 py-3 text-center">
          <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">{totalHoras}</p>
          <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">horas/mes en total</p>
        </div>
      </div>

      {areas.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-border bg-surface p-12 text-center">
          <p className="text-fg-muted">No tienes materias asignadas en este trimestre.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-bg text-left text-xs font-semibold uppercase tracking-wide text-fg-muted">
                  <th className="px-5 py-3">Área / Materia</th>
                  <th className="px-5 py-3">Cursos</th>
                  <th className="px-5 py-3 text-center whitespace-nowrap">Horas/mes por curso</th>
                  <th className="px-5 py-3 text-center">Horas totales</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {areas.map(a => {
                  const bgColor = NIVEL_COLOR[a.nivel] ?? 'bg-gray-600'
                  return (
                    <tr key={a.materiaId} className="hover:bg-surface-2 transition-colors">
                      <td className="px-5 py-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">{a.campo}</p>
                        <p className="font-semibold text-fg">{a.materia}</p>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {a.cursos.map((c, i) => (
                            <span key={i} className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium text-white whitespace-nowrap ${bgColor}`}>
                              {c}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-center text-fg-muted">{a.horasMesCurso || '—'}</td>
                      <td className="px-5 py-3 text-center">
                        <Badge variant="info">{a.horasTotales}h</Badge>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-bg font-bold">
                  <td className="px-5 py-3 text-fg" colSpan={3}>Total</td>
                  <td className="px-5 py-3 text-center text-fg">{totalHoras}h</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Asesoría de curso */}
      <div className="rounded-xl border border-border bg-surface shadow-sm p-5">
        <h2 className="text-sm font-semibold text-fg mb-3">Asesoría de curso</h2>
        {cursosAsesor.length === 0 ? (
          <p className="text-sm text-fg-muted">No eres asesor/a de ningún curso en esta gestión.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {cursosAsesor.map((c, i) => {
              const bgColor = NIVEL_COLOR[c.grado.nivel.nombre] ?? 'bg-gray-600'
              return (
                <span
                  key={i}
                  className={`inline-flex items-center gap-1.5 rounded-full pl-2.5 pr-3 py-1 text-sm font-medium text-white ${bgColor}`}
                >
                  <Icon name="graduation-cap" className="h-4 w-4" />
                  {c.grado.nombre} "{c.letra}"
                </span>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
