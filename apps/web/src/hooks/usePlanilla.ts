import { useState, useEffect, useCallback } from 'react'
import { api, ApiError } from '../lib/api'
import { Instrumento } from '@edusync/types'

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface IndicadorPlanilla {
  id:               string
  nombre:           string
  instrumento:      Instrumento
  fecha_aplicacion: string
  es_parcial:       boolean
  orden:            number
  dimension_id:     string
}

export interface DimensionPlanilla {
  id:          string
  nombre:      string
  puntaje_max: number
  orden:       number
  indicadores: IndicadorPlanilla[]
}

export interface EstudiantePlanilla {
  id:        string
  nombre:    string
  apellido:  string
  codigo:    string
  notas:     Record<string, number | null>
  promedios: Record<string, number | null>
  total:     number | null
  escala:    'ED' | 'DA' | 'DO' | 'DP' | null
}

export interface TrimestrePlanilla {
  id:          string
  numero:      number
  fecha_inicio: string
  fecha_fin:   string
  cerrado:     boolean
}

export interface PlanillaData {
  asignacion: {
    id:      string
    materia: { nombre: string; campo: { nombre: string } }
    paralelo: { letra: string; grado: { nombre: string; nivel: { nombre: string } } }
    gestion: { id: string; anno: number; trimestres: TrimestrePlanilla[] }
    docente: { nombre: string; apellido: string }
  }
  dimensiones:  DimensionPlanilla[]
  estudiantes:  EstudiantePlanilla[]
}

interface PromediosResponse {
  promedios: Record<string, number | null>
  total:     number | null
  escala:    'ED' | 'DA' | 'DO' | 'DP' | null
}

export interface CreateIndicadorData {
  asignacion_id:    string
  dimension_id:     string
  trimestre_id?:    string
  nombre:           string
  instrumento:      Instrumento
  fecha_aplicacion: string
  es_parcial:       boolean
  orden:            number
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePlanilla(asignacion_id: string, trimestre_id?: string) {
  const [data,    setData]    = useState<PlanillaData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [saving,  setSaving]  = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const qs = trimestre_id ? `?trimestre_id=${trimestre_id}` : ''
      setData(await api.get<PlanillaData>(`/planilla/${asignacion_id}${qs}`))
    } catch {
      setError('No se pudo cargar la planilla')
    } finally {
      setLoading(false)
    }
  }, [asignacion_id, trimestre_id])

  useEffect(() => { load() }, [load])

  // ── Actualizar una nota (optimista) ───────────────────────────────────────

  const updateNota = useCallback(async (
    indicador_id:  string,
    estudiante_id: string,
    puntaje:       number | null
  ) => {
    const key = `${indicador_id}-${estudiante_id}`
    setSaving(s => new Set(s).add(key))

    // Optimistic update de la nota cruda
    setData(prev => {
      if (!prev) return prev
      return {
        ...prev,
        estudiantes: prev.estudiantes.map(est =>
          est.id !== estudiante_id ? est : { ...est, notas: { ...est.notas, [indicador_id]: puntaje } }
        ),
      }
    })

    try {
      const result = await api.put<PromediosResponse>('/notas', { indicador_id, estudiante_id, puntaje })

      // Actualizar promedios/total/escala con valores del servidor
      setData(prev => {
        if (!prev) return prev
        return {
          ...prev,
          estudiantes: prev.estudiantes.map(est =>
            est.id !== estudiante_id ? est : {
              ...est,
              promedios: result.promedios,
              total:     result.total,
              escala:    result.escala,
            }
          ),
        }
      })
    } catch (err) {
      // Revertir optimistic update en error
      load()
      throw err
    } finally {
      setSaving(s => { const n = new Set(s); n.delete(key); return n })
    }
  }, [load])

  // ── Indicadores ──────────────────────────────────────────────────────────

  const addIndicador = useCallback(async (dto: CreateIndicadorData) => {
    const created = await api.post<IndicadorPlanilla & { dimension: DimensionPlanilla }>('/indicadores', dto)
    setData(prev => {
      if (!prev) return prev
      return {
        ...prev,
        dimensiones: prev.dimensiones.map(dim =>
          dim.id !== dto.dimension_id ? dim : {
            ...dim,
            indicadores: [...dim.indicadores, { ...created, dimension_id: dto.dimension_id }]
              .sort((a, b) => a.orden - b.orden),
          }
        ),
        // Añadir columna null para cada estudiante
        estudiantes: prev.estudiantes.map(est => ({
          ...est,
          notas: { ...est.notas, [created.id]: null },
        })),
      }
    })
  }, [])

  const updateIndicador = useCallback(async (
    id:   string,
    data: Partial<Omit<CreateIndicadorData, 'asignacion_id' | 'dimension_id'>>
  ) => {
    const updated = await api.put<IndicadorPlanilla>(`/indicadores/${id}`, data)
    setData(prev => {
      if (!prev) return prev
      return {
        ...prev,
        dimensiones: prev.dimensiones.map(dim => ({
          ...dim,
          indicadores: dim.indicadores.map(ind => ind.id === id ? { ...ind, ...updated } : ind),
        })),
      }
    })
  }, [])

  const deleteIndicador = useCallback(async (id: string) => {
    await api.delete(`/indicadores/${id}`)
    setData(prev => {
      if (!prev) return prev
      return {
        ...prev,
        dimensiones: prev.dimensiones.map(dim => ({
          ...dim,
          indicadores: dim.indicadores.filter(ind => ind.id !== id),
        })),
        estudiantes: prev.estudiantes.map(est => {
          const notas = { ...est.notas }
          delete notas[id]
          return { ...est, notas }
        }),
      }
    })
  }, [])

  return {
    data, loading, error, saving,
    reload:          load,
    updateNota,
    addIndicador,
    updateIndicador,
    deleteIndicador,
  }
}
