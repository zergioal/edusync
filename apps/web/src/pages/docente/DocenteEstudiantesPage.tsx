import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../../lib/api'
import { Spinner, Button } from '@edusync/ui'
import { Icon } from '../../components/ui/Icon'
import { BackButton } from '../../components/ui/BackButton'
import { abbreviateGrado, NIVEL_STYLES, NIVEL_FALLBACK } from '../../lib/cursoDisplay'

// ─── Tipos ──────────────────────────────────────────────────────────────────

interface ParaleloCard { id: string; letra: string; grado: { nombre: string; nivel: { nombre: string } } }
interface Asignacion { id: string; materia: { nombre: string }; paralelo: { id: string; letra: string; grado: { nombre: string; nivel: { nombre: string } } }; gestion: { anno: number } }
interface Estudiante { id: string; codigo: string; usuario: { nombre: string; apellido: string } }

export default function DocenteEstudiantesPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

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

  const cargarLista = useCallback(async (paraleloId: string) => {
    setLoadingLista(true)
    try {
      setEstudiantes(await api.get<Estudiante[]>(`/estudiantes?paralelo_id=${paraleloId}`))
    } catch {
      setEstudiantes([])
    } finally {
      setLoadingLista(false)
    }
  }, [])

  function seleccionar(p: ParaleloCard) {
    setSeleccionado(p)
    setSearchParams({ paralelo_id: p.id }, { replace: true })
    cargarLista(p.id)
  }

  function volverACursos() {
    setSeleccionado(null)
    setEstudiantes([])
    setSearchParams({}, { replace: true })
  }

  // Deep-link / "volver" desde el perfil de un estudiante: restaura el curso
  // seleccionado a partir de ?paralelo_id= en vez de caer siempre a la grilla.
  useEffect(() => {
    if (paralelos.length === 0 || seleccionado) return
    const paraleloId = searchParams.get('paralelo_id')
    if (!paraleloId) return
    const match = paralelos.find(p => p.id === paraleloId)
    if (match) { setSeleccionado(match); cargarLista(match.id) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paralelos])

  function perfilUrl(estId: string, tab: string): string {
    const params = new URLSearchParams({ tab })
    if (seleccionado) params.set('paralelo_id', seleccionado.id)
    return `/dashboard/docente/estudiante/${estId}?${params}`
  }

  // ── Vista: lista de estudiantes de un curso propio ──────────────────────────

  if (seleccionado) {
    const materiasDelCurso = [...new Set(asignaciones.filter(a => a.paralelo.id === seleccionado.id).map(a => a.materia.nombre))]
    return (
      <div className="space-y-4">
        <div>
          <BackButton onClick={volverACursos} label="Volver a mis cursos" className="mb-2" />
          <h1 className="text-xl font-bold text-fg">
            {seleccionado.grado.nombre} "{seleccionado.letra}"
          </h1>
          <p className="text-sm text-fg-muted mt-0.5">{materiasDelCurso.join(', ')}</p>
        </div>

        {/* Vista de tarjetas en pantallas chicas — la tabla completa se reserva para pantallas anchas */}
        <div className="sm:hidden space-y-2">
          {loadingLista ? (
            <div className="flex justify-center py-12"><Spinner /></div>
          ) : estudiantes.length === 0 ? (
            <div className="rounded-xl border border-border bg-surface p-8 text-center text-sm text-fg-muted">
              No hay estudiantes matriculados en este paralelo.
            </div>
          ) : (
            estudiantes.map(est => (
              <div key={est.id} className="rounded-xl border border-border bg-surface p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-fg">{est.usuario.apellido}, {est.usuario.nombre}</p>
                  <span className="font-mono text-xs bg-surface-2 px-2 py-1 rounded text-fg-muted flex-shrink-0">{est.codigo}</span>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button variant="ghost" size="sm" className="flex-1 text-fg-muted hover:text-fg border border-border"
                    onClick={() => navigate(perfilUrl(est.id, 'datos'))}>
                    Ver datos
                  </Button>
                  <Button variant="ghost" size="sm" className="flex-1 text-indigo-600 hover:text-indigo-800 border border-border"
                    onClick={() => navigate(perfilUrl(est.id, 'calificaciones'))}>
                    Calificaciones
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Tabla — desde sm hacia arriba */}
        <div className="hidden sm:block rounded-xl border border-border bg-surface shadow-sm overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
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
                      onClick={() => navigate(perfilUrl(est.id, 'datos'))}>
                      Ver datos
                    </Button>
                    <Button variant="ghost" size="sm" className="text-indigo-600 hover:text-indigo-800"
                      onClick={() => navigate(perfilUrl(est.id, 'calificaciones'))}>
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
      <div className="flex items-center gap-2.5">
        <Icon name="users" className="h-6 w-6 text-fg-muted" />
        <div>
          <h1 className="text-2xl font-bold text-fg">Mis Estudiantes</h1>
          <p className="text-sm text-fg-muted mt-0.5">Selecciona uno de tus cursos para ver su lista — los demás aparecen vacíos.</p>
        </div>
      </div>

      {loadingGrid ? (
        <div className="flex justify-center py-20"><Spinner /></div>
      ) : (
        <div className="space-y-8">
          {niveles.map(nivelNombre => {
            const style = NIVEL_STYLES[nivelNombre] ?? NIVEL_FALLBACK
            const cards = byNivel[nivelNombre]!.sort((a, b) => {
              const numA = parseInt(a.grado?.nombre?.match(/\d+/)?.[0] ?? '0')
              const numB = parseInt(b.grado?.nombre?.match(/\d+/)?.[0] ?? '0')
              return numA !== numB ? numA - numB : a.letra.localeCompare(b.letra)
            })
            return (
              <div key={nivelNombre}>
                <div className="flex items-center gap-3 mb-4">
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${style.badge}`}>
                    {style.label || nivelNombre}
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
                        className={`flex flex-col items-center justify-center rounded-xl border-2 h-20 text-center transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md ${style.bg} ${style.border} ${style.hover}`}
                      >
                        <p className={`text-base font-extrabold leading-tight px-1 ${style.num}`}>
                          {abbreviateGrado(p.grado?.nombre ?? '', p.letra)}
                        </p>
                        <p className="mt-1 text-[10px] font-medium text-fg-muted uppercase tracking-wide">
                          {style.label || nivelNombre}
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
