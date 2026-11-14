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
const VERDE_FONDO = ARGB('E2F5E9')
const VERDE_TEXTO = ARGB('15803D')

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

interface OpcionesCeldaDato { centrar?: boolean; zebra?: boolean }

function estilizarCeldaDato(cell: ExcelJS.Cell, { centrar, zebra }: OpcionesCeldaDato) {
  cell.border = BORDE_FINO
  cell.alignment = { horizontal: centrar ? 'center' : 'left', vertical: 'middle' }
  if (zebra) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GRIS_ZEBRA } }
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

/** Cuenta aprobados/reprobados (nota > 50 = aprobado) sobre quienes ya tienen un total. */
function statsAprobacion(estudiantes: Array<{ total: number | null }>) {
  const conNotaArr = estudiantes.filter(e => e.total != null)
  const aprobados  = conNotaArr.filter(e => e.total! > 50).length
  return { aprobados, reprobados: conNotaArr.length - aprobados, conNota: conNotaArr.length, totalEstudiantes: estudiantes.length }
}

/** Letra de columna de Excel (1 → A, 27 → AA, …) a partir del índice 1-based. */
function colLetra(ws: ExcelJS.Worksheet, indice: number): string {
  return ws.getColumn(indice).letter
}

/**
 * Pinta en vivo (recalcula solo si cambia el valor) la columna de un total cuantitativo:
 * verde si aprueba (>50), rojo si reprueba (≤50) — mismo criterio que el resto del sistema.
 * `rango` son las filas de datos, ej. "F5:F32".
 */
function condicionalAprobadoReprobado(ws: ExcelJS.Worksheet, rango: string) {
  ws.addConditionalFormatting({
    ref: rango,
    rules: [
      {
        type: 'cellIs', operator: 'greaterThan', formulae: ['50'], priority: 1,
        style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: VERDE_FONDO } }, font: { bold: true, color: { argb: VERDE_TEXTO } } },
      },
      {
        // Las notas son enteras — "< 51" equivale a "≤ 50" (exceljs no define lessThanOrEqual).
        type: 'cellIs', operator: 'lessThan', formulae: ['51'], priority: 2,
        style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: ROJO_FONDO } }, font: { bold: true, color: { argb: ROJO_TEXTO } } },
      },
    ],
  })
}

/**
 * Pie con el resumen de aprobados/reprobados del trimestre (fórmulas COUNTIF/COUNT en vivo,
 * se recalculan solas si se edita una nota) + aviso si el % de reprobados supera 30 — mismo
 * criterio que la tarjeta "Resumen del trimestre" de la planilla web.
 */
function escribirResumenAprobacion(
  ws: ExcelJS.Worksheet, numCols: number, colTotal: string, colNombre: string,
  primeraFila: number, ultimaFila: number,
  stats: { aprobados: number; reprobados: number; conNota: number; totalEstudiantes: number },
) {
  const rangoTotal  = `${colTotal}${primeraFila}:${colTotal}${ultimaFila}`
  const rangoNombre = `${colNombre}${primeraFila}:${colNombre}${ultimaFila}`
  const pctAprobados  = stats.conNota > 0 ? Math.round((stats.aprobados / stats.conNota) * 100) : 0
  const pctReprobados = stats.conNota > 0 ? Math.round((stats.reprobados / stats.conNota) * 100) : 0
  const aviso = pctReprobados > 30
    ? `Aviso: más del 30% de los estudiantes está reprobando este trimestre (${pctReprobados}%).`
    : ''

  ws.addRow([])
  const filaTitulo = ws.addRow(['Resumen del trimestre'])
  ws.mergeCells(filaTitulo.number, 1, filaTitulo.number, numCols)
  filaTitulo.getCell(1).font = { bold: true, size: 11, color: { argb: AZUL_TEXTO } }

  const filaAprob = ws.addRow(['Aprobados (> 50)'])
  const celdaAprob = filaAprob.getCell(2)
  celdaAprob.value = { formula: `COUNTIF(${rangoTotal},">50")`, result: stats.aprobados }
  celdaAprob.font = { bold: true, color: { argb: VERDE_TEXTO } }
  const celdaPctAprob = filaAprob.getCell(3)
  celdaPctAprob.value = { formula: `IFERROR(ROUND(${celdaAprob.address}/COUNT(${rangoTotal})*100,0),0)`, result: pctAprobados }
  celdaPctAprob.numFmt = '0"%"'
  celdaPctAprob.font = { color: { argb: VERDE_TEXTO } }

  const filaReprob = ws.addRow(['Reprobados (≤ 50)'])
  const celdaReprob = filaReprob.getCell(2)
  celdaReprob.value = { formula: `COUNTIF(${rangoTotal},"<=50")`, result: stats.reprobados }
  celdaReprob.font = { bold: true, color: { argb: ROJO_TEXTO } }
  const celdaPctReprob = filaReprob.getCell(3)
  celdaPctReprob.value = { formula: `IFERROR(ROUND(${celdaReprob.address}/COUNT(${rangoTotal})*100,0),0)`, result: pctReprobados }
  celdaPctReprob.numFmt = '0"%"'
  celdaPctReprob.font = { color: { argb: ROJO_TEXTO } }

  const filaNota = ws.addRow([{
    formula: `COUNT(${rangoTotal})&" de "&COUNTA(${rangoNombre})&" estudiante(s) con nota registrada en este trimestre."`,
    result: `${stats.conNota} de ${stats.totalEstudiantes} estudiante(s) con nota registrada en este trimestre.`,
  }])
  ws.mergeCells(filaNota.number, 1, filaNota.number, numCols)
  filaNota.getCell(1).font = { size: 9, italic: true, color: { argb: GRIS_TEXTO } }

  const filaAviso = ws.addRow([{
    formula: `IF(${celdaPctReprob.address}>30,"Aviso: más del 30% de los estudiantes está reprobando este trimestre ("&${celdaPctReprob.address}&"%).","")`,
    result: aviso,
  }])
  ws.mergeCells(filaAviso.number, 1, filaAviso.number, numCols)
  filaAviso.getCell(1).font = { bold: true, color: { argb: ROJO_TEXTO } }
  ws.addConditionalFormatting({
    ref: `A${filaAviso.number}`,
    rules: [{
      type: 'expression', formulae: [`A${filaAviso.number}<>""`], priority: 1,
      style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: ROJO_FONDO } } },
    }],
  })
}

/** Protege las fórmulas de edición accidental — sin contraseña real, es solo un seguro
 *  contra un "oops": cualquiera puede desproteger desde Excel sin pedir nada. */
async function protegerFormulas(ws: ExcelJS.Worksheet) {
  await ws.protect('', {
    selectLockedCells:   true,
    selectUnlockedCells: true,
    formatCells:         true,
    formatColumns:       true,
    formatRows:          true,
    sort:                true,
    autoFilter:          true,
    insertRows:          false,
    deleteRows:          false,
    insertColumns:       false,
    deleteColumns:       false,
  })
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
    data.materias.forEach((_m, i) => estilizarCeldaDato(row.getCell(3 + i), { centrar: true, zebra: idx % 2 === 1 }))
    estilizarCeldaDato(row.getCell(numCols), { centrar: true, zebra: idx % 2 === 1 })
  })

  ws.columns = [{ width: 5 }, { width: 28 }, ...data.materias.map(() => ({ width: 10 })), { width: 10 }]
  if (data.estudiantes.length > 0) {
    const primera = filaEnc2.number + 1
    const ultima  = filaEnc2.number + data.estudiantes.length
    // Una sola regla cubre de un tirón todas las materias + el promedio final.
    condicionalAprobadoReprobado(ws, `${colLetra(ws, 3)}${primera}:${colLetra(ws, numCols)}${ultima}`)
  }
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
    notaExtracurricular: number | null
    total:     number | null
    escala:    string | null
  }>
}

/**
 * Registro completo CON fórmulas en vivo (no valores fijos): los subtotales por dimensión
 * promedian su rango de indicadores, el total suma los subtotales + nota extra, y la escala
 * se calcula del total — así, si alguien corrige una nota acá mismo, todo se recalcula solo.
 * Nota: a diferencia de una plantilla manual con un tope fijo de 52 filas/3 parciales por
 * dimensión, acá cada indicador es el que el/la docente realmente cargó — las fórmulas se arman
 * dinámicamente según cuántos indicadores tenga cada dimensión en esta asignación/trimestre.
 */
export async function generateRegistroMateriaExcel(data: RegistroMateriaExcelData): Promise<Buffer> {
  const wb = nuevoLibro()
  const ws = wb.addWorksheet('Registro')

  // ── Arma los encabezados y, de paso, recuerda en qué columna cae cada cosa ──
  const headerRow1: (string | number)[] = ['N°', 'Apellidos y Nombres']
  const headerRow2: (string | number)[] = ['', '']
  const rangosDimension: Array<{ inicio: number; fin: number; prom: number; tieneIndicadores: boolean }> = []
  let col = 3
  for (const dim of data.dimensiones) {
    const inicio = col
    for (const ind of dim.indicadores) { headerRow1.push(labelDimension(dim.nombre)); headerRow2.push(ind.nombre); col++ }
    const tieneIndicadores = col > inicio
    const fin = col - 1
    headerRow1.push(labelDimension(dim.nombre)); headerRow2.push('PROM.')
    rangosDimension.push({ inicio, fin, prom: col, tieneIndicadores })
    col++
  }
  const colExtra  = col; headerRow1.push('Nota Extra'); headerRow2.push(''); col++
  const colTotal  = col; headerRow1.push('Total');      headerRow2.push(''); col++
  const colEscala = col; headerRow1.push('Escala');     headerRow2.push(''); col++
  const numCols = col

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
  ws.mergeCells(filaEnc1.number, colExtra, filaEnc2.number, colExtra)
  ws.mergeCells(filaEnc1.number, colTotal, filaEnc2.number, colTotal)
  ws.mergeCells(filaEnc1.number, colEscala, filaEnc2.number, colEscala)

  // ── Filas de datos: los indicadores quedan como valores editables; PROM./Total/Escala
  // llevan fórmula (con el resultado ya calculado como caché, para que se vea bien incluso
  // antes de que la hoja recalcule) ──────────────────────────────────────────────────────
  data.estudiantes.forEach((est, idx) => {
    const row: (string | number | null)[] = [idx + 1, `${est.apellido} ${est.nombre}`]
    for (const dim of data.dimensiones) {
      for (const ind of dim.indicadores) row.push(est.notas[ind.id] ?? null)
      row.push(null) // PROM. — se completa abajo con la fórmula
    }
    row.push(est.notaExtracurricular ?? null, null, null) // Nota Extra (valor) + Total/Escala (fórmula)
    const excelRow = ws.addRow(row)
    const r = excelRow.number

    data.dimensiones.forEach((dim, i) => {
      const rango = rangosDimension[i]!
      // Las celdas de nota quedan destrabadas (para editar) y con validación 1..puntaje_max —
      // mismo rango que ya exige el input de la planilla web.
      for (let c = rango.inicio; c <= rango.fin; c++) {
        const cell = excelRow.getCell(c)
        cell.protection = { locked: false }
        cell.dataValidation = {
          type: 'whole', operator: 'between', formulae: [1, dim.puntaje_max], allowBlank: true,
          showErrorMessage: true, errorTitle: 'Nota fuera de rango',
          error: `La nota debe ser un número entero entre 1 y ${dim.puntaje_max}.`,
        }
      }
      const promCell = excelRow.getCell(rango.prom)
      if (rango.tieneIndicadores) {
        const refIni = `${colLetra(ws, rango.inicio)}${r}`
        const refFin = `${colLetra(ws, rango.fin)}${r}`
        promCell.value = { formula: `IFERROR(ROUND(AVERAGE(${refIni}:${refFin}),0),"")`, result: est.promedios[dim.id] ?? '' }
      } else {
        promCell.value = est.promedios[dim.id] ?? ''
      }
    })
    excelRow.getCell(colExtra).protection = { locked: false }

    const refsSuma = [...rangosDimension.map(rg => `${colLetra(ws, rg.prom)}${r}`), `${colLetra(ws, colExtra)}${r}`]
    const condVacio = refsSuma.map(ref => `${ref}=""`).join(',')
    excelRow.getCell(colTotal).value = {
      formula: `IFERROR(IF(AND(${condVacio}),"",SUM(${refsSuma.join(',')})),"")`,
      result: est.total ?? '',
    }

    const refTotal = `${colLetra(ws, colTotal)}${r}`
    excelRow.getCell(colEscala).value = {
      formula: `IF(${refTotal}="","",IF(${refTotal}>=85,"DP",IF(${refTotal}>=69,"DO",IF(${refTotal}>=51,"DA","ED"))))`,
      result: est.escala ?? '',
    }

    const zebra = idx % 2 === 1
    for (let c = 1; c <= numCols; c++) estilizarCeldaDato(excelRow.getCell(c), { centrar: c > 2, zebra })
  })

  ws.columns = [{ width: 5 }, { width: 28 }, ...Array(numCols - 2).fill({ width: 10 })]
  if (data.estudiantes.length > 0) {
    const primera = filaEnc2.number + 1
    const ultima  = filaEnc2.number + data.estudiantes.length
    condicionalAprobadoReprobado(ws, `${colLetra(ws, colTotal)}${primera}:${colLetra(ws, colTotal)}${ultima}`)
    escribirResumenAprobacion(ws, numCols, colLetra(ws, colTotal), colLetra(ws, 2), primera, ultima, statsAprobacion(data.estudiantes))
  }
  finalizarHoja(ws, numCols, filaEnc2.number)
  await protegerFormulas(ws)
  return aBuffer(wb)
}

/**
 * Igual que generateRegistroMateriaExcel pero solo con los 4 subtotales por dimensión
 * (sin el detalle de cada indicador) y el total — para repartir una planilla más compacta.
 */
export async function generateRegistroResumenExcel(data: RegistroMateriaExcelData): Promise<Buffer> {
  const wb = nuevoLibro()
  const ws = wb.addWorksheet('Registro (resumen)')

  const headerRow: (string | number)[] = ['N°', 'Apellidos y Nombres', ...data.dimensiones.map(d => labelDimension(d.nombre)), 'Nota Extra', 'Total /100', 'Escala']
  const numCols   = headerRow.length
  const colExtra  = 3 + data.dimensiones.length
  const colTotal  = colExtra + 1
  const colEscala = colTotal + 1

  escribirEncabezadoReporte(
    ws, `Registro (resumen) – ${data.materia} (${data.campo})`,
    `${data.nivel} ${data.grado} "${data.paralelo}" – Trimestre ${data.trimestre} – Gestión ${data.anno} – Prof. ${data.docente}`,
    numCols,
  )
  const filaEnc = ws.addRow(headerRow)
  estilizarFilaEncabezado(filaEnc, numCols)

  // Las 4 dimensiones ya vienen como promedio final (no hay detalle de indicadores en esta
  // hoja) — solo Total y Escala llevan fórmula, sumando esas 4 celdas + la nota extra.
  data.estudiantes.forEach((est, idx) => {
    const row: (string | number | null)[] = [
      idx + 1,
      `${est.apellido} ${est.nombre}`,
      ...data.dimensiones.map(d => est.promedios[d.id] ?? ''),
      est.notaExtracurricular ?? null,
      null, null,
    ]
    const excelRow = ws.addRow(row)
    const r = excelRow.number

    data.dimensiones.forEach((dim, i) => {
      const cell = excelRow.getCell(3 + i)
      cell.protection = { locked: false }
      cell.dataValidation = {
        type: 'whole', operator: 'between', formulae: [0, dim.puntaje_max], allowBlank: true,
        showErrorMessage: true, errorTitle: 'Promedio fuera de rango',
        error: `El promedio de esta dimensión debe ser un número entero entre 0 y ${dim.puntaje_max}.`,
      }
    })
    excelRow.getCell(colExtra).protection = { locked: false }

    const refsSuma = [
      ...data.dimensiones.map((_d, i) => `${colLetra(ws, 3 + i)}${r}`),
      `${colLetra(ws, colExtra)}${r}`,
    ]
    const condVacio = refsSuma.map(ref => `${ref}=""`).join(',')
    excelRow.getCell(colTotal).value = {
      formula: `IFERROR(IF(AND(${condVacio}),"",SUM(${refsSuma.join(',')})),"")`,
      result: est.total ?? '',
    }
    const refTotal = `${colLetra(ws, colTotal)}${r}`
    excelRow.getCell(colEscala).value = {
      formula: `IF(${refTotal}="","",IF(${refTotal}>=85,"DP",IF(${refTotal}>=69,"DO",IF(${refTotal}>=51,"DA","ED"))))`,
      result: est.escala ?? '',
    }

    const zebra = idx % 2 === 1
    for (let c = 1; c <= numCols; c++) estilizarCeldaDato(excelRow.getCell(c), { centrar: c > 2, zebra })
  })

  ws.columns = [{ width: 5 }, { width: 28 }, ...data.dimensiones.map(() => ({ width: 14 })), { width: 10 }, { width: 10 }, { width: 10 }]
  if (data.estudiantes.length > 0) {
    const primera = filaEnc.number + 1
    const ultima  = filaEnc.number + data.estudiantes.length
    condicionalAprobadoReprobado(ws, `${colLetra(ws, colTotal)}${primera}:${colLetra(ws, colTotal)}${ultima}`)
    escribirResumenAprobacion(ws, numCols, colLetra(ws, colTotal), colLetra(ws, 2), primera, ultima, statsAprobacion(data.estudiantes))
  }
  finalizarHoja(ws, numCols, filaEnc.number)
  await protegerFormulas(ws)
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
    data.trimestres.forEach((_t, i) => estilizarCeldaDato(row.getCell(3 + i), { centrar: true, zebra }))
    estilizarCeldaDato(row.getCell(numCols - 1), { centrar: true, zebra })
    estilizarCeldaDato(row.getCell(numCols), { zebra })
  })

  ws.columns = [{ width: 5 }, { width: 28 }, ...data.trimestres.map(() => ({ width: 10 })), { width: 10 }, { width: 42 }]
  if (data.estudiantes.length > 0) {
    const primera = filaEnc.number + 1
    const ultima  = filaEnc.number + data.estudiantes.length
    // Cubre los trimestres y el promedio final — no la columna de observaciones (texto).
    condicionalAprobadoReprobado(ws, `${colLetra(ws, 3)}${primera}:${colLetra(ws, numCols - 1)}${ultima}`)
  }
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
    data.subareas.forEach((_s, i) => estilizarCeldaDato(row.getCell(3 + i), { centrar: true, zebra }))
    estilizarCeldaDato(row.getCell(numCols), { centrar: true, zebra })
  })

  ws.columns = [{ width: 5 }, { width: 28 }, ...data.subareas.map(() => ({ width: 16 })), { width: 14 }]
  if (data.estudiantes.length > 0) {
    const primera = filaEnc2.number + 1
    const ultima  = filaEnc2.number + data.estudiantes.length
    condicionalAprobadoReprobado(ws, `${colLetra(ws, 3)}${primera}:${colLetra(ws, numCols)}${ultima}`)
  }
  finalizarHoja(ws, numCols, filaEnc2.number)
  return aBuffer(wb)
}
