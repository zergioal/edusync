import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { Spinner, Button } from '@edusync/ui'

// ─── Tipos ──────────────────────────────────────────────────────────────────

interface ParaleloCard { id: string; letra: string; grado: { nombre: string; nivel: { nombre: string } } }
interface Asignacion { id: string; materia: { nombre: string }; paralelo: { id: string; letra: string; grado: { nombre: string; nivel: { nombre: string } } }; gestion: { anno: number } }
interface Estudiante { id: string; codigo: string; usuario: { nombre: string; apellido: string } }

// ─── Helpers (mismos que EstudiantesPage.tsx de Director/Coordinador) ────────

const ORDINAL_MAP: Record<string, string> = {
  primer: '1°', primero: '1°',
  segundo: '2°', segunda: '2°',
  tercer: '3°', tercero: '3°',
  cuarto: '4°', cuarta: '4°',
}

function abbreviateGrado(gradoNombre: string, letra: string): string {
  const numMatch = gradoNombre.match(/^(\d+°)/)
  if (numMatch) return `${numMatch[1]} ${letra}`
  const first = gradoNombre.toLowerCase().split(' ')[0] ?? ''
  const num = ORDINAL_MAP[first]
  if (num) return `${num} ${letra}`
  return `${gradoNombre.slice(0, 4)} ${letra}`
}

const NIVEL_STYLES: Record<string, { bg: string; border: string; hover: string; badge: string; num: string; label: string }> = {
  INICIAL: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/40', border: 'border-emerald-200 dark:border-emerald-800/60',
    hover: 'hover:bg-emerald-100 dark:hover:bg-emerald-900/50 hover:border-emerald-400 dark:hover:border-emerald-600 hover:shadow-emerald-100 dark:hover:shadow-none',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400', num: 'text-emerald-700 dark:text-emerald-400', label: 'Inicial',
  },
  PRIMARIA: {
    bg: 'bg-sky-50 dark:bg-sky-950/40', border: 'border-sky-200 dark:border-sky-800/60',
    hover: 'hover:bg-sky-100 dark:hover:bg-sky-900/50 hover:border-sky-400 dark:hover:border-sky-600 hover:shadow-sky-100 dark:hover:shadow-none',
    badge: 'bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-400', num: 'text-sky-700 dark:text-sky-400', label: 'Primaria',
  },
  SECUNDARIA: {
    bg: 'bg-violet-50 dark:bg-violet-950/40', border: 'border-violet-200 dark:border-violet-800/60',
    hover: 'hover:bg-violet-100 dark:hover:bg-violet-900/50 hover:border-violet-400 dark:hover:border-violet-600 hover:shadow-violet-100 dark:hover:shadow-none',
    badge: 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-400', num: 'text-violet-800 dark:text-violet-300', label: 'Secundaria',
  },
}

export default function DocenteEstudiantesPage() {
  const navigate = useNavigate()

  const [paralelos,     setParalelos]     = useState<ParaleloCard[]>([])
  const [asignaciones,  setAsignaciones]  = useState<Asignacion[]>([])
  const [loadingGrid,   setLoadingGrid]   = useState(true)

  const [seleccionado,  setSeleccionado]  = useState<ParaleloCard | null>(null)
  const [estudiantes,   setEstudiantes]   = useState<Estudiante[]>([])
  const [loadingLista,  setLoadingLista]  = useState(false)

  const cargarGrid = useCallback(async () => {
    setLoadingGrid(true)
    try {
      const [todosParalelos, mias] = await Promise.all([
        api.get<ParaleloCard[]>('/paralelos'),
        api.get<Asignacion[]>('/asignaciones/mias'),
      ])
      setParalelos(todosParalelos)
      setAsignaciones(mias)
    } catch { /* silencioso — la grilla queda vacía */ }
    finally { setLoadingGrid(false) }
  }, [])

  useEffect(() => { cargarGrid() }, [cargarGrid])

  const misParaleloIds = new Set(asignaciones.map(a => a.paralelo.id))

  async function seleccionar(p: ParaleloCard) {
    setSeleccionado(p)
    setLoadingLista(true)
    try {
      setEstudiantes(await api.get<Estudiante[]>(`/estudiantes?paralelo_id=${p.id}`))
    } catch {
      setEstudiantes([])
    } finally {
      setLoadingLista(false)
    }
  }

  // ── Vista: lista de estudiantes de un curso propio ──────────────────────────

  if (seleccionado) {
    const materiasDelCurso = [...new Set(asignaciones.filter(a => a.paralelo.id === seleccionado.id).map(a => a.materia.nombre))]
    return (
      <div className="space-y-4">
        <div>
          <button
            onClick={() => setSeleccionado(null)}
            className="mb-1 flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 font-medium transition-colors"
          >
            ← Volver a mis cursos
          </button>
          <h1 className="text-xl font-bold text-fg">
            {seleccionado.grado.nombre} "{seleccionado.letra}"
          </h1>
          <p className="text-sm text-fg-muted mt-0.5">{materiasDelCurso.join(', ')}</p>
        </div>

        <div className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-bg text-left text-xs font-semibold uppercase tracking-wide text-fg-muted">
                <th className="px-5 py-3">Código</th>
                <th className="px-5 py-3">Apellidos y Nombres</th>
                <th className="px-5 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loadingLista && (
                <tr><td colSpan={3} className="py-12 text-center"><Spinner /></td></tr>
              )}
              {!loadingLista && estudiantes.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-12 text-center text-fg-muted">
                    No hay estudiantes matriculados en este paralelo.
                  </td>
                </tr>
              )}
              {estudiantes.map(est => (
                <tr key={est.id} className="hover:bg-surface-2 transition-colors">
                  <td className="px-5 py-3">
                    <span className="font-mono text-xs bg-surface-2 px-2 py-1 rounded text-fg">{est.codigo}</span>
                  </td>
                  <td className="px-5 py-3 font-medium text-fg">{est.usuario.apellido}, {est.usuario.nombre}</td>
                  <td className="px-5 py-3 text-right space-x-2">
                    <Button variant="ghost" size="sm" className="text-fg-muted hover:text-fg"
                      onClick={() => navigate(`/dashboard/docente/estudiante/${est.id}?tab=datos`)}>
                      Ver datos
                    </Button>
                    <Button variant="ghost" size="sm" className="text-indigo-600 hover:text-indigo-800"
                      onClick={() => navigate(`/dashboard/docente/estudiante/${est.id}?tab=calificaciones`)}>
                      Calificaciones
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // ── Vista: grilla de cursos (todos los de la institución, solo los propios son clicables) ──

  const byNivel: Record<string, ParaleloCard[]> = {}
  for (const p of paralelos) {
    const n = p.grado?.nivel?.nombre
    if (!n) continue
    ;(byNivel[n] ??= []).push(p)
  }
  const nivelOrder = ['INICIAL', 'PRIMARIA', 'SECUNDARIA']
  const niveles = nivelOrder.filter(n => byNivel[n])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">Mis Estudiantes</h1>
        <p className="text-sm text-fg-muted mt-0.5">Selecciona uno de tus cursos para ver su lista — los demás aparecen vacíos.</p>
      </div>

      {loadingGrid ? (
        <div className="flex justify-center py-20"><Spinner /></div>
      ) : (
        <div className="space-y-8">
          {niveles.map(nivelNombre => {
            const style = NIVEL_STYLES[nivelNombre]
            const cards = byNivel[nivelNombre]!.sort((a, b) => {
              const numA = parseInt(a.grado?.nombre?.match(/\d+/)?.[0] ?? '0')
              const numB = parseInt(b.grado?.nombre?.match(/\d+/)?.[0] ?? '0')
              return numA !== numB ? numA - numB : a.letra.localeCompare(b.letra)
            })
            return (
              <div key={nivelNombre}>
                <div className="flex items-center gap-3 mb-4">
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${style?.badge ?? 'bg-surface-2 text-fg-muted'}`}>
                    {style?.label ?? nivelNombre}
                  </span>
                  <div className="h-px flex-1 bg-surface-2" />
                </div>
                <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))' }}>
                  {cards.map(p => {
                    const esMio = misParaleloIds.has(p.id)
                    if (!esMio) {
                      return (
                        <div
                          key={p.id}
                          aria-hidden="true"
                          className="h-20 rounded-xl border-2 border-dashed border-border/50 bg-surface-2/20"
                        />
                      )
                    }
                    return (
                      <button
                        key={p.id}
                        onClick={() => seleccionar(p)}
                        className={`flex flex-col items-center justify-center rounded-xl border-2 h-20 text-center transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md ${style?.bg ?? ''} ${style?.border ?? ''} ${style?.hover ?? ''}`}
                      >
                        <p className={`text-base font-extrabold leading-tight px-1 ${style?.num ?? 'text-fg'}`}>
                          {abbreviateGrado(p.grado?.nombre ?? '', p.letra)}
                        </p>
                        <p className="mt-1 text-[10px] font-medium text-fg-muted uppercase tracking-wide">
                          {style?.label ?? nivelNombre}
                        </p>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
