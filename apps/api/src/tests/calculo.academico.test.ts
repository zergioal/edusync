import { describe, it, expect } from 'vitest'
import {
  calcularNotaDimension,
  calcularEscala,
  calcularPromedioAnual,
  determinarResultado,
  calcNotasEstudiante,
  type DimInfo,
  type IndicadorMin,
} from '../services/calculo.service'

// ─── calcularNotaDimension ────────────────────────────────────────────────────

describe('calcularNotaDimension', () => {
  it('array vacío → 0', () => {
    expect(calcularNotaDimension([])).toBe(0)
  })

  it('[null, null] → 0', () => {
    expect(calcularNotaDimension([null, null])).toBe(0)
  })

  it('[5, 7] → 6 (promedio 6.0)', () => {
    expect(calcularNotaDimension([5, 7])).toBe(6)
  })

  it('[5, 8] → 7 (promedio 6.5 redondea a 7)', () => {
    expect(calcularNotaDimension([5, 8])).toBe(7)
  })

  it('[10] → 10', () => {
    expect(calcularNotaDimension([10])).toBe(10)
  })

  it('[null, 8, null] → 8 (ignora nulls)', () => {
    expect(calcularNotaDimension([null, 8, null])).toBe(8)
  })

  it('[1, 1, 1] → 1', () => {
    expect(calcularNotaDimension([1, 1, 1])).toBe(1)
  })
})

// ─── calcularEscala ───────────────────────────────────────────────────────────

describe('calcularEscala', () => {
  it('0 → "ED"', ()  => { expect(calcularEscala(0)).toBe('ED') })
  it('50 → "ED"', () => { expect(calcularEscala(50)).toBe('ED') })
  it('51 → "DA"', () => { expect(calcularEscala(51)).toBe('DA') })
  it('68 → "DA"', () => { expect(calcularEscala(68)).toBe('DA') })
  it('69 → "DO"', () => { expect(calcularEscala(69)).toBe('DO') })
  it('84 → "DO"', () => { expect(calcularEscala(84)).toBe('DO') })
  it('85 → "DP"', () => { expect(calcularEscala(85)).toBe('DP') })
  it('100 → "DP"', () => { expect(calcularEscala(100)).toBe('DP') })
})

// ─── calcularPromedioAnual ────────────────────────────────────────────────────

describe('calcularPromedioAnual', () => {
  it('(80, 75, 90) → 82', () => {
    expect(calcularPromedioAnual(80, 75, 90)).toBe(82)
  })

  it('(80, null, 90) → 85 (solo promedia 2 valores)', () => {
    expect(calcularPromedioAnual(80, null, 90)).toBe(85)
  })

  it('(null, null, null) → 0', () => {
    expect(calcularPromedioAnual(null, null, null)).toBe(0)
  })

  it('(51, 49, 52) → 51 (redondea 50.67)', () => {
    expect(calcularPromedioAnual(51, 49, 52)).toBe(51)
  })

  it('(50, 50, 51) → 50 (redondea 50.33)', () => {
    expect(calcularPromedioAnual(50, 50, 51)).toBe(50)
  })
})

// ─── determinarResultado ──────────────────────────────────────────────────────

describe('determinarResultado', () => {
  it('[80, 75, 90, 65] → "PROMOVIDO"', () => {
    expect(determinarResultado([80, 75, 90, 65])).toBe('PROMOVIDO')
  })

  it('[80, 50, 90] → "REPITE" (50 no supera el mínimo)', () => {
    expect(determinarResultado([80, 50, 90])).toBe('REPITE')
  })

  it('[51, 51, 51] → "PROMOVIDO"', () => {
    expect(determinarResultado([51, 51, 51])).toBe('PROMOVIDO')
  })

  it('[50, 80, 90] → "REPITE"', () => {
    expect(determinarResultado([50, 80, 90])).toBe('REPITE')
  })

  it('[] → "PROMOVIDO" (sin materias: vacuously true)', () => {
    expect(determinarResultado([])).toBe('PROMOVIDO')
  })
})

// ─── Casos de integración ─────────────────────────────────────────────────────

const DIMS: DimInfo[] = [
  { id: 'ser',   nombre: 'SER/DECIDIR',     puntaje_max: 10, orden: 0 },
  { id: 'saber', nombre: 'SABER',           puntaje_max: 45, orden: 1 },
  { id: 'hacer', nombre: 'HACER',           puntaje_max: 40, orden: 2 },
  { id: 'auto',  nombre: 'AUTOEVALUACIÓN',  puntaje_max: 5,  orden: 3 },
]

function buildScenario(
  serNotas:   (number | null)[],
  saberNotas: (number | null)[],
  hacerNotas: (number | null)[],
  autoNotas:  (number | null)[],
): { indicadores: IndicadorMin[]; notasMap: Map<string, number | null> } {
  const indicadores: IndicadorMin[] = []
  const notasMap = new Map<string, number | null>()

  const groups = [
    { dimId: 'ser',   notas: serNotas   },
    { dimId: 'saber', notas: saberNotas },
    { dimId: 'hacer', notas: hacerNotas },
    { dimId: 'auto',  notas: autoNotas  },
  ]

  let seq = 0
  for (const { dimId, notas } of groups) {
    for (const nota of notas) {
      const id = `ind-${seq++}`
      indicadores.push({ id, dimension_id: dimId })
      notasMap.set(id, nota)
    }
  }

  return { indicadores, notasMap }
}

describe('Integración — nota completa de materia', () => {
  it('SER=8, SABER=38, HACER=36, AUTO=4 → total=86, escala=DP', () => {
    const { indicadores, notasMap } = buildScenario([8], [38], [36], [4])
    const { total } = calcNotasEstudiante(indicadores, notasMap, DIMS)
    expect(total).toBe(86)
    expect(calcularEscala(total)).toBe('DP')
  })

  it('SER=5, SABER=25, HACER=20, AUTO=3 → total=53, escala=DA', () => {
    const { indicadores, notasMap } = buildScenario([5], [25], [20], [3])
    const { total } = calcNotasEstudiante(indicadores, notasMap, DIMS)
    expect(total).toBe(53)
    expect(calcularEscala(total)).toBe('DA')
  })

  it('SER=3, SABER=20, HACER=18, AUTO=2 → total=43, escala=ED', () => {
    const { indicadores, notasMap } = buildScenario([3], [20], [18], [2])
    const { total } = calcNotasEstudiante(indicadores, notasMap, DIMS)
    expect(total).toBe(43)
    expect(calcularEscala(total)).toBe('ED')
  })

  it('SER=[null,null]→0, SABER=[40,null]→40, HACER=[35]→35, AUTO=[4]→4 → total=79, escala=DO', () => {
    const { indicadores, notasMap } = buildScenario(
      [null, null],
      [40, null],
      [35],
      [4],
    )
    const { total } = calcNotasEstudiante(indicadores, notasMap, DIMS)
    expect(total).toBe(79)
    expect(calcularEscala(total)).toBe('DO')
  })
})
