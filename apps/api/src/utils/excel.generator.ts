import * as XLSX from 'xlsx'

// ── Tabla simple genérica (nómina, estadísticas, listados, etc.) ──────────────

export interface ColumnaTablaExcel { header: string; key: string }
export interface TablaSimpleExcelData {
  titulo:    string
  subtitulo?: string
  columnas:  ColumnaTablaExcel[]
  filas:     Record<string, string | number | null | undefined>[]
}

export function generateTablaSimpleExcel(data: TablaSimpleExcelData): Buffer {
  const wb = XLSX.utils.book_new()

  const rows: (string | number | null)[][] = [
    [data.titulo],
    ...(data.subtitulo ? [[data.subtitulo]] : []),
    [],
    data.columnas.map(c => c.header),
    ...data.filas.map(fila => data.columnas.map(c => fila[c.key] ?? '')),
  ]

  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = data.columnas.map(() => ({ wch: 18 }))

  const lastCol = data.columnas.length - 1
  const merges = [{ s: { r: 0, c: 0 }, e: { r: 0, c: lastCol } }]
  if (data.subtitulo) merges.push({ s: { r: 1, c: 0 }, e: { r: 1, c: lastCol } })
  ws['!merges'] = merges

  XLSX.utils.book_append_sheet(wb, ws, 'Reporte')
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

export interface CentralizadorExcelData {
  paralelo:  string
  grado:     string
  nivel:     string
  trimestre: number
  anno:      number
  materias:  Array<{ id: string; nombre: string; campo: string }>
  estudiantes: Array<{
    nombre:    string
    apellido:  string
    codigo:    string
    notas:     Record<string, { total: number | null }>
    promedio:  number | null
  }>
}

export function generateCentralizadorExcel(data: CentralizadorExcelData): Buffer {
  const wb = XLSX.utils.book_new()

  const titulo   = `Centralizador – ${data.nivel} ${data.grado} "${data.paralelo}"`
  const subtitulo = `Trimestre ${data.trimestre} – Gestión ${data.anno}`

  const headerRow1 = ['N°', 'Apellidos y Nombres', ...data.materias.map(m => m.nombre), 'Promedio']
  const headerRow2 = ['', '', ...data.materias.map(m => m.campo), '']

  const rows: (string | number | null)[][] = [
    [titulo],
    [subtitulo],
    [],
    headerRow1,
    headerRow2,
    ...data.estudiantes.map((est, i) => [
      i + 1,
      `${est.apellido} ${est.nombre}`,
      ...data.materias.map(m => est.notas[m.id]?.total ?? ''),
      est.promedio ?? '',
    ]),
  ]

  const ws = XLSX.utils.aoa_to_sheet(rows)

  // Column widths
  const cols = [{ wch: 4 }, { wch: 30 }, ...data.materias.map(() => ({ wch: 8 })), { wch: 8 }]
  ws['!cols'] = cols

  // Merge title cells
  const lastCol = data.materias.length + 1
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: lastCol } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: lastCol } },
  ]

  XLSX.utils.book_append_sheet(wb, ws, 'Centralizador')
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
  return buf
}

// ── Registro (planilla) de una materia por trimestre ──────────────────────────

export interface RegistroMateriaExcelData {
  materia:   string
  campo:     string
  nivel:     string
  grado:     string
  paralelo:  string
  anno:      number
  docente:   string
  trimestre: number
  dimensiones: Array<{
    id:          string
    nombre:      string
    puntaje_max: number
    indicadores: Array<{ id: string; nombre: string }>
  }>
  estudiantes: Array<{
    nombre:    string
    apellido:  string
    codigo:    string
    notas:     Record<string, number | null>
    promedios: Record<string, number | null>
    total:     number | null
    escala:    string | null
  }>
}

export function generateRegistroMateriaExcel(data: RegistroMateriaExcelData): Buffer {
  const wb = XLSX.utils.book_new()

  const titulo    = `Registro – ${data.materia} (${data.campo})`
  const subtitulo = `${data.nivel} ${data.grado} "${data.paralelo}" – Trimestre ${data.trimestre} – Gestión ${data.anno} – Prof. ${data.docente}`

  const headerRow1: (string | number)[] = ['N°', 'Apellidos y Nombres']
  const headerRow2: (string | number)[] = ['', '']
  for (const dim of data.dimensiones) {
    for (const ind of dim.indicadores) { headerRow1.push(dim.nombre); headerRow2.push(ind.nombre) }
    headerRow1.push(dim.nombre); headerRow2.push('PROM.')
  }
  headerRow1.push('Total', 'Escala')
  headerRow2.push('', '')

  const rows: (string | number | null)[][] = [
    [titulo],
    [subtitulo],
    [],
    headerRow1,
    headerRow2,
    ...data.estudiantes.map((est, i) => {
      const row: (string | number | null)[] = [i + 1, `${est.apellido} ${est.nombre}`]
      for (const dim of data.dimensiones) {
        for (const ind of dim.indicadores) row.push(est.notas[ind.id] ?? '')
        row.push(est.promedios[dim.id] ?? '')
      }
      row.push(est.total ?? '', est.escala ?? '')
      return row
    }),
  ]

  const ws = XLSX.utils.aoa_to_sheet(rows)

  const totalCols = headerRow1.length
  ws['!cols'] = [{ wch: 4 }, { wch: 28 }, ...Array(totalCols - 2).fill({ wch: 10 })]
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: totalCols - 1 } },
  ]

  XLSX.utils.book_append_sheet(wb, ws, 'Registro')
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

// ── Centralizador de una asignación (T1/T2/T3 + observación) ──────────────────

export interface CentralizadorAsignacionExcelData {
  materia:   string
  nivel:     string
  grado:     string
  paralelo:  string
  anno:      number
  meta:      number
  trimestres:  Array<{ id: string; numero: number }>
  estudiantes: Array<{
    nombre:      string
    apellido:    string
    codigo:      string
    totales:     Record<string, number | null>
    escalas:     Record<string, string | null>
    observacion: string
  }>
}

export function generateCentralizadorAsignacionExcel(data: CentralizadorAsignacionExcelData): Buffer {
  const wb = XLSX.utils.book_new()

  const titulo    = `Centralizador – ${data.materia}`
  const subtitulo = `${data.nivel} ${data.grado} "${data.paralelo}" – Gestión ${data.anno}`

  const headerRow: (string | number)[] = ['N°', 'Apellidos y Nombres', ...data.trimestres.map(t => `${t.numero}° Trim.`), 'Observaciones']

  const rows: (string | number | null)[][] = [
    [titulo],
    [subtitulo],
    [],
    headerRow,
    ...data.estudiantes.map((est, i) => [
      i + 1,
      `${est.apellido} ${est.nombre}`,
      ...data.trimestres.map(t => est.totales[t.id] ?? ''),
      est.observacion,
    ]),
  ]

  const ws = XLSX.utils.aoa_to_sheet(rows)

  const lastCol = 2 + data.trimestres.length
  ws['!cols'] = [{ wch: 4 }, { wch: 28 }, ...data.trimestres.map(() => ({ wch: 9 })), { wch: 40 }]
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: lastCol } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: lastCol } },
  ]

  XLSX.utils.book_append_sheet(wb, ws, 'Centralizador')
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}
