import { useState, useEffect } from 'react'
import { api } from '../lib/api'

export interface CursoDocente {
  id:    string
  letra: string
  grado: { nombre: string; nivel: { nombre: string } }
}

interface AsignacionMia { paralelo: CursoDocente }

/** Cursos propios del docente (donde dicta una materia o es asesor), sin duplicados — usado
 *  por las páginas de Reportes para acotar los selectores de curso a "lo mío". */
export function useMisCursos() {
  const [cursos,  setCursos]  = useState<CursoDocente[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get<AsignacionMia[]>('/asignaciones/mias'),
      api.get<CursoDocente[]>('/asignaciones/mis-cursos-asesor').catch(() => []),
    ]).then(([mias, asesorias]) => {
      const map = new Map<string, CursoDocente>()
      for (const a of mias) map.set(a.paralelo.id, a.paralelo)
      for (const p of asesorias) map.set(p.id, p)
      setCursos([...map.values()].sort((a, b) => {
        const numA = parseInt(a.grado?.nombre?.match(/\d+/)?.[0] ?? '0')
        const numB = parseInt(b.grado?.nombre?.match(/\d+/)?.[0] ?? '0')
        return numA !== numB ? numA - numB : a.letra.localeCompare(b.letra)
      }))
    }).finally(() => setLoading(false))
  }, [])

  return { cursos, loading }
}
