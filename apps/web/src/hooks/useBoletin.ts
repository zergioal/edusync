import { useState, useCallback } from 'react'
import { api, apiDownload } from '../lib/api'

type Escala = 'ED' | 'DA' | 'DO' | 'DP'

interface BoletinBase {
  tipo: 'REGULAR' | 'INICIAL'
  estudiante: { nombre: string; apellido: string; codigo: string }
  trimestre:  { numero: number }
  total_asistencias: number
  total_faltas:      number
  total_tardanzas:   number
}

interface BoletinRegular extends BoletinBase {
  tipo: 'REGULAR'
  dimensiones:      Array<{ nombre: string; puntaje_max: number; key: string }>
  materias:         Array<{ nombre: string; campo: string; total: number; escala: Escala; observacion: string | null }>
  promedio_general: number
  escala_general:   Escala
}

interface BoletinInicial extends BoletinBase {
  tipo: 'INICIAL'
  materias_inicial: Array<{ nombre: string; docente: string; observacion: string | null }>
}

export type BoletinData = BoletinRegular | BoletinInicial

export interface UseBoletin {
  data:        BoletinData | null
  loading:     boolean
  downloading: boolean
  error:       string | null
  trimestreId: string
  setTrimestreId: (id: string) => void
  cargar:      (estudianteId: string, trimestreId: string) => Promise<void>
  descargarPDF: (estudianteId: string, trimestreId: string) => Promise<void>
}

export function useBoletin(): UseBoletin {
  const [data,        setData]        = useState<BoletinData | null>(null)
  const [loading,     setLoading]     = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [trimestreId, setTrimestreId] = useState('')

  const cargar = useCallback(async (estudianteId: string, tid: string) => {
    if (!estudianteId || !tid) return
    setLoading(true); setError(null); setData(null)
    try {
      const result = await api.get<BoletinData>(`/boletines/${estudianteId}?trimestre_id=${tid}`)
      setData(result)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar el boletín')
    } finally {
      setLoading(false)
    }
  }, [])

  const descargarPDF = useCallback(async (estudianteId: string, tid: string) => {
    if (!estudianteId || !tid) return
    setDownloading(true)
    try {
      const boletin = data ?? await api.get<BoletinData>(`/boletines/${estudianteId}?trimestre_id=${tid}`)
      const nombre  = `${boletin.estudiante.apellido}_${boletin.estudiante.nombre}`.replace(/\s+/g, '_')
      await apiDownload(
        `/boletines/${estudianteId}/pdf?trimestre_id=${tid}`,
        `boletin_${nombre}_T${boletin.trimestre.numero}.pdf`,
      )
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al descargar el PDF')
    } finally {
      setDownloading(false)
    }
  }, [data])

  return { data, loading, downloading, error, trimestreId, setTrimestreId, cargar, descargarPDF }
}
