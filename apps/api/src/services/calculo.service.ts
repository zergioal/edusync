// Servicio centralizado de cálculo académico (Ley 070 Bolivia)
// SER(10) + SABER(45) + HACER(40) + AUTO(5) = 100

export type Escala = 'ED' | 'DA' | 'DO' | 'DP'

export const DIM_KEYS = ['ser', 'saber', 'hacer', 'autoevaluacion'] as const
export type DimKey = typeof DIM_KEYS[number]

export function calcularEscala(nota: number): Escala {
  if (nota <= 50) return 'ED'
  if (nota <= 68) return 'DA'
  if (nota <= 84) return 'DO'
  return 'DP'
}

export function calcularNotaDimension(notas: (number | null)[]): number {
  const vals = notas.filter((v): v is number => v !== null)
  if (vals.length === 0) return 0
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
}

export function calcularPromedioAnual(
  t1: number | null,
  t2: number | null,
  t3: number | null,
): number {
  const vals = [t1, t2, t3].filter((v): v is number => v !== null)
  if (vals.length === 0) return 0
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
}

export function determinarResultado(
  promediosPorMateria: number[],
): 'PROMOVIDO' | 'REPITE' {
  return promediosPorMateria.every(p => p > 50) ? 'PROMOVIDO' : 'REPITE'
}

export interface DimInfo {
  id:          string
  nombre:      string
  puntaje_max: number
  orden:       number
}

export interface IndicadorMin {
  id:           string
  dimension_id: string
}

export interface NotasResult {
  /** nota por dimension_id */
  dimNotas:  Record<string, number | null>
  /** suma de promedios por dimension */
  total:     number
  hasAny:    boolean
}

/** Calcula promedios por dimensión y total para un estudiante dado un conjunto de indicadores */
export function calcNotasEstudiante(
  indicadores:   IndicadorMin[],
  notasMap:      Map<string, number | null>, // indicador_id → puntaje
  dimensiones:   DimInfo[],
): NotasResult {
  const dimNotas: Record<string, number | null> = {}
  let total  = 0
  let hasAny = false

  for (const dim of dimensiones) {
    const inds = indicadores.filter(i => i.dimension_id === dim.id)
    if (inds.length === 0) { dimNotas[dim.id] = null; continue }

    const vals = inds
      .map(i => notasMap.get(i.id) ?? null)
      .filter((v): v is number => v !== null)

    if (vals.length === 0) { dimNotas[dim.id] = null; continue }

    hasAny = true
    const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
    dimNotas[dim.id] = avg
    total += avg
  }

  return { dimNotas, total, hasAny }
}

/** Mapea dimensiones (by orden) a claves ser/saber/hacer/autoevaluacion */
export function mapDimToKeys(
  dimensiones: DimInfo[],
  dimNotas:    Record<string, number | null>,
): Record<DimKey, number> {
  const result = { ser: 0, saber: 0, hacer: 0, autoevaluacion: 0 }
  dimensiones.forEach((dim, i) => {
    const key = DIM_KEYS[i]
    if (key) result[key] = dimNotas[dim.id] ?? 0
  })
  return result
}
