import ExcelJS from 'exceljs'

// ── Estilo institucional compartido por todos los reportes ────────────────────
// (mismo azul que ya usan los encabezados de los PDF — ver AZUL en los templates)

const ARGB = (hex: string) => `FF${hex}`
const AZUL        = ARGB('1F3864')
const AZUL_TEXTO  = ARGB('1F3864')
const BLANCO      = ARGB('FFFFFF')
const GRIS_ZEBRA  = ARGB('F3F4F6')
const GRIS_BORDE  = ARGB('D9D9D9')
const GRIS_TEXTO  = ARGB('6B7280')
const ROJO_FONDO  = ARGB('FDE7E7')
const ROJO_TEXTO  = ARGB('B91C1C')

const BORDE_FINO: Partial<ExcelJS.Borders> = {
  top:    { style: 'thin', color: { argb: GRIS_BORDE } },
  left:   { style: 'thin', color: { argb: GRIS_BORDE } },
  bottom: { style: 'thin', color: { argb: GRIS_BORDE } },
  right:  { style: 'thin', color: { argb: GRIS_BORDE } },
}

/** Nombre legible de las 4 dimensiones de la Ley 070 — en BD se guardan en mayúsculas con guión bajo. */
const DIMENSION_LABELS: Record<string, string> = {
  SER_DECIDIR:    'Ser/Decidir',
  SABER:          'Saber',
  HACER:          'Hacer',
  AUTOEVALUACION: 'Autoevaluación',
}
const labelDimension = (nombre: string) => DIMENSION_LABELS[nombre] ?? nombre

function nuevoLibro(): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'EduSync'
  wb.created = new Date()
  return wb
}

/** Título + subtítulo (fusionados en toda la fila), estilo institucional. */
function escribirEncabezadoReporte(ws: ExcelJS.Worksheet, titulo: string, subtitulo: string | undefined, numCols: number) {
  const filaTitulo = ws.addRow([titulo])
  ws.mergeCells(filaTitulo.number, 1, filaTitulo.number, numCols)
  filaTitulo.getCell(1).font = { bold: true, size: 14, color: { argb: AZUL_TEXTO } }
  filaTitulo.getCell(1).alignment = { vertical: 'middle' }
  filaTitulo.height = 22

  if (subtitulo) {
    const filaSub = ws.addRow([subtitulo])
    ws.mergeCells(filaSub.number, 1, filaSub.number, numCols)
    filaSub.getCell(1).font = { size: 10, italic: true, color: { argb: GRIS_TEXTO } }
  }
  ws.addRow([])
}

/** Aplica el estilo de encabezado (fondo azul, texto blanco) a una fila ya agregada. */
function estilizarFilaEncabezado(fila: ExcelJS.Row, numCols: number) {
  for (let c = 1; c <= numCols; c++) {
    const cell = fila.getCell(c)
    cell.font = { bold: true, size: 10, color: { argb: BLANCO } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AZUL } }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    cell.border = BORDE_FINO
  }
  fila.height = 28
}

interface OpcionesCeldaDato { centrar?: boolean; zebra?: boolean; negativo?: boolean }

function estilizarCeldaDato(cell: ExcelJS.Cell, { centrar, zebra, negativo }: OpcionesCeldaDato) {
  cell.border = BORDE_FINO
  cell.alignment = { horizontal: centrar ? 'center' : 'left', vertical: 'middle' }
  if (negativo) {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ROJO_FONDO } }
    cell.font = { ...(cell.font ?? {}), bold: true, color: { argb: ROJO_TEXTO } }
  } else if (zebra) {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GRIS_ZEBRA } }
  }
}

/** Fila de filtro automático + congelar paneles sobre la última fila de encabezado + pie de página. */
function finalizarHoja(ws: ExcelJS.Worksheet, numCols: number, filaEncabezado: number) {
  ws.views = [{ state: 'frozen', ySplit: filaEncabezado }]
  ws.autoFilter = { from: { row: filaEncabezado, column: 1 }, to: { row: filaEncabezado, column: numCols } }
  ws.addRow([])
  const filaPie = ws.addRow([`Generado el ${new Date().toLocaleDateString('es-BO', { day: '2-digit', month: 'long', year: 'numeric' })}`])
  filaPie.getCell(1).font = { size: 8, italic: true, color: { argb: GRIS_TEXTO } }
}

async function aBuffer(wb: ExcelJS.Workbook): Promise<Buffer> {
  return Buffer.from(await wb.xlsx.writeBuffer())
}

// ── Tabla simple genérica (nómina, estadísticas, listados, etc.) ──────────────

export interface ColumnaTablaExcel { header: string; key: string; align?: 'left' | 'center' }
export interface TablaSimpleExcelData {
  titulo:    string
  subtitulo?: string
  columnas:  ColumnaTablaExcel[]
  filas:     Record<string, string | number | null | undefined>[]
}

export async function generateTablaSimpleExcel(data: TablaSimpleExcelData): Promise<Buffer> {
  const wb = nuevoLibro()
  const ws = wb.addWorksheet('Reporte')
  const numCols = data.columnas.length

  escribirEncabezadoReporte(ws, data.titulo, data.subtitulo, numCols)
  const filaEnc = ws.addRow(data.columnas.map(c => c.header))
  estilizarFilaEncabezado(filaEnc, numCols)

  data.filas.forEach((fila, idx) => {
    const row = ws.addRow(data.columnas.map(c => fila[c.key] ?? ''))
    data.columnas.forEach((c, i) => estilizarCeldaDato(row.getCell(i + 1), { centrar: c.align === 'center', zebra: idx % 2 === 1 }))
  })

  ws.columns = data.columnas.map(() => ({ width: 18 }))
  finalizarHoja(ws, numCols, filaEnc.number)
  return aBuffer(wb)
}

// ── Centralizador general (todas las materias de un paralelo, un trimestre) ──

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

export async function generateCentralizadorExcel(data: CentralizadorExcelData): Promise<Buffer> {
  const wb = nuevoLibro()
  const ws = wb.addWorksheet('Centralizador')
  const numCols = 2 + data.materias.length + 1

  escribirEncabezadoReporte(ws, `Centralizador – ${data.nivel} ${data.grado} "${data.paralelo}"`, `Trimestre ${data.trimestre} – Gestión ${data.anno}`, numCols)

  const filaEnc1 = ws.addRow(['N°', 'Apellidos y Nombres', ...data.materias.map(m => m.nombre), 'Promedio'])
  const filaEnc2 = ws.addRow(['', '', ...data.materias.map(m => m.campo), ''])
  estilizarFilaEncabezado(filaEnc1, numCols)
  estilizarFilaEncabezado(filaEnc2, numCols)
  ws.mergeCells(filaEnc1.number, 1, filaEnc2.number, 1)
  ws.mergeCells(filaEnc1.number, 2, filaEnc2.number, 2)

  data.estudiantes.forEach((est, idx) => {
    const row = ws.addRow([idx + 1, `${est.apellido} ${est.nombre}`, ...data.materias.map(m => est.notas[m.id]?.total ?? ''), est.promedio ?? ''])
    estilizarCeldaDato(row.getCell(1), { centrar: true, zebra: idx % 2 === 1 })
    estilizarCeldaDato(row.getCell(2), { zebra: idx % 2 === 1 })
    data.materias.forEach((m, i) => {
      const total = est.notas[m.id]?.total ?? null
      estilizarCeldaDato(row.getCell(3 + i), { centrar: true, zebra: idx % 2 === 1, negativo: total != null && total <= 50 })
    })
    estilizarCeldaDato(row.getCell(numCols), { centrar: true, zebra: idx % 2 === 1, negativo: (est.promedio ?? 100) <= 50 })
  })

  ws.columns = [{ width: 5 }, { width: 28 }, ...data.materias.map(() => ({ width: 10 })), { width: 10 }]
  finalizarHoja(ws, numCols, filaEnc2.number)
  return aBuffer(wb)
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

export async function generateRegistroMateriaExcel(data: RegistroMateriaExcelData): Promise<Buffer> {
  const wb = nuevoLibro()
  const ws = wb.addWorksheet('Registro')

  const headerRow1: (string | number)[] = ['N°', 'Apellidos y Nombres']
  const headerRow2: (string | number)[] = ['', '']
  for (const dim of data.dimensiones) {
    for (const ind of dim.indicadores) { headerRow1.push(labelDimension(dim.nombre)); headerRow2.push(ind.nombre) }
    headerRow1.push(labelDimension(dim.nombre)); headerRow2.push('PROM.')
  }
  headerRow1.push('Total', 'Escala')
  headerRow2.push('', '')
  const numCols = headerRow1.length

  escribirEncabezadoReporte(
    ws, `Registro – ${data.materia} (${data.campo})`,
    `${data.nivel} ${data.grado} "${data.paralelo}" – Trimestre ${data.trimestre} – Gestión ${data.anno} – Prof. ${data.docente}`,
    numCols,
  )
  const filaEnc1 = ws.addRow(headerRow1)
  const filaEnc2 = ws.addRow(headerRow2)
  estilizarFilaEncabezado(filaEnc1, numCols)
  estilizarFilaEncabezado(filaEnc2, numCols)
  ws.mergeCells(filaEnc1.number, 1, filaEnc2.number, 1)
  ws.mergeCells(filaEnc1.number, 2, filaEnc2.number, 2)
  ws.mergeCells(filaEnc1.number, numCols - 1, filaEnc2.number, numCols - 1)
  ws.mergeCells(filaEnc1.number, numCols, filaEnc2.number, numCols)

  data.estudiantes.forEach((est, idx) => {
    const row: (string | number | null)[] = [idx + 1, `${est.apellido} ${est.nombre}`]
    for (const dim of data.dimensiones) {
      for (const ind of dim.indicadores) row.push(est.notas[ind.id] ?? '')
      row.push(est.promedios[dim.id] ?? '')
    }
    row.push(est.total ?? '', est.escala ?? '')
    const excelRow = ws.addRow(row)
    const zebra = idx % 2 === 1
    const reprobado = est.total != null && est.total <= 50
    for (let c = 1; c <= numCols; c++) {
      estilizarCeldaDato(excelRow.getCell(c), { centrar: c > 2, zebra, negativo: c >= numCols - 1 && reprobado })
    }
  })

  ws.columns = [{ width: 5 }, { width: 28 }, ...Array(numCols - 2).fill({ width: 10 })]
  finalizarHoja(ws, numCols, filaEnc2.number)
  return aBuffer(wb)
}

/**
 * Igual que generateRegistroMateriaExcel pero solo con los 4 subtotales por dimensión
 * (sin el detalle de cada indicador) y el total — para repartir una planilla más compacta.
 */
export async function generateRegistroResumenExcel(data: RegistroMateriaExcelData): Promise<Buffer> {
  const wb = nuevoLibro()
  const ws = wb.addWorksheet('Registro (resumen)')

  const headerRow: (string | number)[] = ['N°', 'Apellidos y Nombres', ...data.dimensiones.map(d => labelDimension(d.nombre)), 'Total /100', 'Escala']
  const numCols = headerRow.length

  escribirEncabezadoReporte(
    ws, `Registro (resumen) – ${data.materia} (${data.campo})`,
    `${data.nivel} ${data.grado} "${data.paralelo}" – Trimestre ${data.trimestre} – Gestión ${data.anno} – Prof. ${data.docente}`,
    numCols,
  )
  const filaEnc = ws.addRow(headerRow)
  estilizarFilaEncabezado(filaEnc, numCols)

  data.estudiantes.forEach((est, idx) => {
    const row: (string | number | null)[] = [
      idx + 1,
      `${est.apellido} ${est.nombre}`,
      ...data.dimensiones.map(d => est.promedios[d.id] ?? ''),
      est.total ?? '',
      est.escala ?? '',
    ]
    const excelRow = ws.addRow(row)
    const zebra = idx % 2 === 1
    const reprobado = est.total != null && est.total <= 50
    for (let c = 1; c <= numCols; c++) {
      estilizarCeldaDato(excelRow.getCell(c), { centrar: c > 2, zebra, negativo: c >= numCols - 1 && reprobado })
    }
  })

  ws.columns = [{ width: 5 }, { width: 28 }, ...data.dimensiones.map(() => ({ width: 14 })), { width: 10 }, { width: 10 }]
  finalizarHoja(ws, numCols, filaEnc.number)
  return aBuffer(wb)
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
    promedio:    number
    observacion: string
  }>
}

export async function generateCentralizadorAsignacionExcel(data: CentralizadorAsignacionExcelData): Promise<Buffer> {
  const wb = nuevoLibro()
  const ws = wb.addWorksheet('Centralizador')
  const numCols = 3 + data.trimestres.length + 1

  escribirEncabezadoReporte(ws, `Centralizador – ${data.materia}`, `${data.nivel} ${data.grado} "${data.paralelo}" – Gestión ${data.anno}`, numCols)

  const filaEnc = ws.addRow(['N°', 'Apellidos y Nombres', ...data.trimestres.map(t => `${t.numero}° Trim.`), 'Promedio', 'Observaciones'])
  estilizarFilaEncabezado(filaEnc, numCols)

  data.estudiantes.forEach((est, idx) => {
    const row = ws.addRow([idx + 1, `${est.apellido} ${est.nombre}`, ...data.trimestres.map(t => est.totales[t.id] ?? ''), est.promedio, est.observacion])
    const zebra = idx % 2 === 1
    estilizarCeldaDato(row.getCell(1), { centrar: true, zebra })
    estilizarCeldaDato(row.getCell(2), { zebra })
    data.trimestres.forEach((t, i) => {
      const total = est.totales[t.id] ?? null
      estilizarCeldaDato(row.getCell(3 + i), { centrar: true, zebra, negativo: total != null && total <= 50 })
    })
    estilizarCeldaDato(row.getCell(numCols - 1), { centrar: true, zebra, negativo: est.promedio <= 50 })
    estilizarCeldaDato(row.getCell(numCols), { zebra })
  })

  ws.columns = [{ width: 5 }, { width: 28 }, ...data.trimestres.map(() => ({ width: 10 })), { width: 10 }, { width: 42 }]
  finalizarHoja(ws, numCols, filaEnc.number)
  return aBuffer(wb)
}

// ─── Centralizador de subáreas (promedio combinado de un área con subáreas) ──

export interface CentralizadorSubareasExcelData {
  area_padre: string
  nivel:      string
  grado:      string
  paralelo:   string
  anno:       number
  trimestre:  number
  subareas:   Array<{ asignacion_id: string; nombre: string; docente: string }>
  estudiantes: Array<{
    codigo:        string
    nombre:        string
    apellido:      string
    notasSubareas: Array<{ asignacion_id: string; total: number | null }>
    promedio:      number | null
  }>
}

export async function generateCentralizadorSubareasExcel(data: CentralizadorSubareasExcelData): Promise<Buffer> {
  const wb = nuevoLibro()
  const ws = wb.addWorksheet('Subáreas')
  const numCols = 2 + data.subareas.length + 1

  escribirEncabezadoReporte(ws, `Centralizador de Subáreas – ${data.area_padre}`, `${data.nivel} ${data.grado} "${data.paralelo}" – Trimestre ${data.trimestre}° – Gestión ${data.anno}`, numCols)

  const filaEnc1 = ws.addRow(['N°', 'Apellidos y Nombres', ...data.subareas.map(s => s.nombre), 'Promedio combinado'])
  const filaEnc2 = ws.addRow(['', '', ...data.subareas.map(s => s.docente), ''])
  estilizarFilaEncabezado(filaEnc1, numCols)
  estilizarFilaEncabezado(filaEnc2, numCols)
  ws.mergeCells(filaEnc1.number, 1, filaEnc2.number, 1)
  ws.mergeCells(filaEnc1.number, 2, filaEnc2.number, 2)
  ws.mergeCells(filaEnc1.number, numCols, filaEnc2.number, numCols)

  data.estudiantes.forEach((est, idx) => {
    const row = ws.addRow([
      idx + 1,
      `${est.apellido} ${est.nombre}`,
      ...data.subareas.map(s => est.notasSubareas.find(n => n.asignacion_id === s.asignacion_id)?.total ?? ''),
      est.promedio ?? '',
    ])
    const zebra = idx % 2 === 1
    estilizarCeldaDato(row.getCell(1), { centrar: true, zebra })
    estilizarCeldaDato(row.getCell(2), { zebra })
    data.subareas.forEach((s, i) => {
      const total = est.notasSubareas.find(n => n.asignacion_id === s.asignacion_id)?.total ?? null
      estilizarCeldaDato(row.getCell(3 + i), { centrar: true, zebra, negativo: total != null && total <= 50 })
    })
    estilizarCeldaDato(row.getCell(numCols), { centrar: true, zebra, negativo: est.promedio != null && est.promedio <= 50 })
  })

  ws.columns = [{ width: 5 }, { width: 28 }, ...data.subareas.map(() => ({ width: 16 })), { width: 14 }]
  finalizarHoja(ws, numCols, filaEnc2.number)
  return aBuffer(wb)
}
