import { useState, useEffect } from 'react'
import { api } from '../lib/api'

interface CentralizadorAnualData {
  meta:        number
  trimestres:  Array<{ id: string; numero: number }>
  estudiantes: Array<{ id: string; totales: Record<string, number | null> }>
}

export interface MensajeAnual {
  texto:    string
  aprobado: boolean
}

/**
 * Para el registro del último trimestre: combina los totales ya cerrados de los trimestres
 * anteriores (vía el centralizador de la asignación, que no cambia mientras se edita el actual)
 * con el total del trimestre que se está viendo/editando ahora, para saber si la nota anual ya
 * está asegurada o cuánto falta — en vivo, mientras el docente va cargando notas.
 */
export function useCentralizadorAnualMensaje(
  asignacionId:      string | undefined,
  trimestreId:       string | undefined,
  esUltimoTrimestre: boolean,
) {
  const [data, setData] = useState<CentralizadorAnualData | null>(null)

  useEffect(() => {
    if (!asignacionId || !esUltimoTrimestre) { setData(null); return }
    api.get<CentralizadorAnualData>(`/planilla/${asignacionId}/centralizador`)
      .then(setData)
      .catch(() => setData(null))
  }, [asignacionId, esUltimoTrimestre])

  function mensajeDe(estudianteId: string, totalTrimestreActual: number | null): MensajeAnual | null {
    if (!data || !trimestreId) return null
    const est = data.estudiantes.find(e => e.id === estudianteId)
    if (!est) return null

    const otrosTrimestres = data.trimestres
      .filter(t => t.id !== trimestreId)
      .reduce((s, t) => s + (est.totales[t.id] ?? 0), 0)
    const acumulado = otrosTrimestres + (totalTrimestreActual ?? 0)
    const falta = data.meta - acumulado

    return falta <= 0
      ? { texto: 'Aprobado de año', aprobado: true }
      : { texto: `Le falta ${falta} puntos para aprobar de año`, aprobado: false }
  }

  return { mensajeDe }
}
