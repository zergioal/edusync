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
  falta:    number
}

/** Color del aviso según cuánto le falta: 1-50 blanco, 51-59 amarillo, 60+ rojo. Aprobado: verde. */
export function colorDeMensaje(msg: MensajeAnual): string {
  if (msg.aprobado) return 'bg-emerald-600 text-white'
  if (msg.falta <= 50) return 'bg-slate-500 dark:bg-slate-600 text-white'
  if (msg.falta <= 59) return 'bg-amber-500 text-white'
  return 'bg-red-600 text-white'
}

/**
 * Para el registro del último trimestre: cuánto necesita el estudiante EN ese trimestre para
 * aprobar la gestión, a partir de los totales ya cerrados de los trimestres anteriores (vía el
 * centralizador de la asignación). Es un cálculo estático — a propósito NO suma la nota que el
 * docente va cargando en el trimestre actual, para que sirva de referencia fija ("necesitás X en
 * este trimestre") y no cambie bajo sus manos mientras va calificando.
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

  function mensajeDe(estudianteId: string): MensajeAnual | null {
    if (!data || !trimestreId) return null
    const est = data.estudiantes.find(e => e.id === estudianteId)
    if (!est) return null

    const otrosTrimestres = data.trimestres
      .filter(t => t.id !== trimestreId)
      .reduce((s, t) => s + (est.totales[t.id] ?? 0), 0)
    const falta = data.meta - otrosTrimestres

    return falta <= 0
      ? { texto: 'Aprobado de año', aprobado: true, falta: 0 }
      : { texto: `Le falta ${falta} puntos para aprobar de año`, aprobado: false, falta }
  }

  return { mensajeDe }
}
