import * as XLSX from 'xlsx'

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
