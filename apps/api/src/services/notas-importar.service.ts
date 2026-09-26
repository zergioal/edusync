import * as XLSX from 'xlsx'
import { prisma } from '@edusync/database'
import { AppError } from '../middlewares/errorHandler'

const COL_CODIGO = 'Código'
const COL_APELLIDOS = 'Apellidos'
const COL_NOMBRES = 'Nombres'

/** Encabezado de columna de un indicador — usado tanto al generar la plantilla como al leerla,
 *  para que ambos lados siempre coincidan exactamente. */
function labelIndicador(dimensionNombre: string, indicadorNombre: string, puntajeMax: number): string {
  return `${dimensionNombre} - ${indicadorNombre} (máx ${puntajeMax})`
}

interface ContextoAsignacion {
  asignacion_id: string
  trimestre: { id: string; cerrado: boolean; fecha_inicio: Date; fecha_fin: Date }
  dimensiones: Array<{ id: string; nombre: string; puntaje_max: number; indicadores: Array<{ id: string; nombre: string }> }>
  estudiantes: Array<{ id: string; codigo: string; nombre: string; apellido: string; estado: string }>
}

async function cargarContexto(asignacion_id: string, trimestre_id: string, usuario_id: string): Promise<ContextoAsignacion> {
  const asignacion = await prisma.asignacion.findUnique({
    where: { id: asignacion_id },
    include: {
      docente: true,
      gestion: { include: { trimestres: true } },
    },
  })
  if (!asignacion) throw new AppError(404, 'Asignación no encontrada', 'NOT_FOUND')

  const docente = await prisma.docente.findUnique({ where: { usuario_id } })
  if (!docente || asignacion.docente_id !== docente.id) {
    throw new AppError(403, 'No tienes permiso para gestionar esta asignación', 'FORBIDDEN')
  }

  const trimestre = asignacion.gestion.trimestres.find(t => t.id === trimestre_id)
  if (!trimestre) throw new AppError(404, 'Trimestre no encontrado', 'NOT_FOUND')

  const institucion_id = (await prisma.usuario.findUnique({ where: { id: usuario_id }, select: { institucion_id: true } }))!.institucion_id

  const dimensionesRaw = await prisma.dimension.findMany({
    where: { institucion_id },
    include: { indicadores: { where: { asignacion_id, trimestre_id }, orderBy: { orden: 'asc' } } },
    orderBy: { orden: 'asc' },
  })

  const matriculas = await prisma.matricula.findMany({
    where: { paralelo_id: asignacion.paralelo_id, gestion_id: asignacion.gestion_id },
    include: { estudiante: { include: { usuario: { select: { nombre: true, apellido: true } } } } },
    orderBy: [{ estudiante: { usuario: { apellido: 'asc' } } }, { estudiante: { usuario: { nombre: 'asc' } } }],
  })

  return {
    asignacion_id,
    trimestre: { id: trimestre.id, cerrado: trimestre.cerrado, fecha_inicio: trimestre.fecha_inicio, fecha_fin: trimestre.fecha_fin },
    dimensiones: dimensionesRaw.map(d => ({
      id: d.id, nombre: d.nombre, puntaje_max: d.puntaje_max,
      indicadores: d.indicadores.map(i => ({ id: i.id, nombre: i.nombre })),
    })),
    estudiantes: matriculas.map(m => ({
      id: m.estudiante.id,
      codigo: m.estudiante.codigo,
      nombre: m.estudiante.usuario.nombre,
      apellido: m.estudiante.usuario.apellido,
      estado: m.estudiante.estado,
    })),
  }
}

export class NotasImportarService {
  // ── Plantilla ────────────────────────────────────────────────────────────────

  async generarPlantilla(asignacion_id: string, trimestre_id: string, usuario_id: string): Promise<Buffer> {
    const ctx = await cargarContexto(asignacion_id, trimestre_id, usuario_id)

    const indicadorIds = ctx.dimensiones.flatMap(d => d.indicadores.map(i => i.id))
    const notas = indicadorIds.length > 0
      ? await prisma.notaIndicador.findMany({ where: { indicador_id: { in: indicadorIds } } })
      : []
    const notaKey = (indicador_id: string, estudiante_id: string) => `${indicador_id}::${estudiante_id}`
    const notaMap = new Map(notas.map(n => [notaKey(n.indicador_id, n.estudiante_id), n.puntaje]))

    const columnasIndicador = ctx.dimensiones.flatMap(d =>
      d.indicadores.map(i => ({ id: i.id, label: labelIndicador(d.nombre, i.nombre, d.puntaje_max) })),
    )

    const header = [COL_CODIGO, COL_APELLIDOS, COL_NOMBRES, ...columnasIndicador.map(c => c.label)]
    const activos = ctx.estudiantes.filter(e => e.estado === 'ACTIVO')

    const rows: (string | number | null)[][] = [
      ['Plantilla de notas — no modifiques ni borres la columna "Código"'],
      [`Descargada el ${new Date().toISOString().slice(0, 10)} — deja vacía una celda para no calificar / borrar esa nota`],
      [],
      header,
      ...activos.map(est => [
        est.codigo, est.apellido, est.nombre,
        ...columnasIndicador.map(c => notaMap.get(notaKey(c.id, est.id)) ?? ''),
      ]),
    ]

    const ws = XLSX.utils.aoa_to_sheet(rows)
    ws['!cols'] = [{ wch: 12 }, { wch: 22 }, { wch: 18 }, ...columnasIndicador.map(() => ({ wch: 14 }))]
    const lastCol = header.length - 1
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: lastCol } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: lastCol } },
    ]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Notas')
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
  }

  // ── Importar ─────────────────────────────────────────────────────────────────

  async importar(
    asignacion_id: string, trimestre_id: string, usuario_id: string, buffer: Buffer,
  ): Promise<{ ok: boolean; actualizadas: number; advertencias: string[]; errores: string[] }> {
    const ctx = await cargarContexto(asignacion_id, trimestre_id, usuario_id)
    if (ctx.trimestre.cerrado) {
      throw new AppError(409, 'El trimestre está cerrado — no se pueden importar calificaciones', 'TRIMESTRE_CERRADO')
    }

    let wb: XLSX.WorkBook
    try {
      wb = XLSX.read(buffer, { type: 'buffer' })
    } catch {
      throw new AppError(400, 'No se pudo leer el archivo — asegúrate de subir el .xlsx o .csv de la plantilla', 'ARCHIVO_INVALIDO')
    }
    const sheet = wb.Sheets[wb.SheetNames[0]!]
    if (!sheet) throw new AppError(400, 'El archivo no tiene hojas', 'ARCHIVO_INVALIDO')
    const filas = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' })

    const headerRowIdx = filas.findIndex(f => f.some(cell => String(cell ?? '').trim().toLowerCase() === COL_CODIGO.toLowerCase()))
    if (headerRowIdx === -1) {
      throw new AppError(400, `No se encontró la fila de encabezados (columna "${COL_CODIGO}") — usa la plantilla descargada sin alterar su estructura`, 'ARCHIVO_INVALIDO')
    }
    const headerRow = filas[headerRowIdx]!.map(c => String(c ?? '').trim())
    const codigoColIdx = headerRow.findIndex(h => h.toLowerCase() === COL_CODIGO.toLowerCase())
    const OTRAS_COLUMNAS_CONOCIDAS = new Set([COL_APELLIDOS.toLowerCase(), COL_NOMBRES.toLowerCase()])

    // Mapear columnas del archivo → indicador (por el label exacto) — por nombre de columna, no por
    // posición, así no importa si el docente reordenó columnas en Excel.
    const indicadorPorLabel = new Map<string, { id: string; puntaje_max: number }>()
    for (const dim of ctx.dimensiones) {
      for (const ind of dim.indicadores) {
        const label = labelIndicador(dim.nombre, ind.nombre, dim.puntaje_max)
        indicadorPorLabel.set(label, { id: ind.id, puntaje_max: dim.puntaje_max })
      }
    }

    const colIndicador = new Map<number, { id: string; puntaje_max: number }>()
    const advertencias: string[] = []
    for (let c = 0; c < headerRow.length; c++) {
      if (c === codigoColIdx) continue
      const label = headerRow[c]!
      if (!label || OTRAS_COLUMNAS_CONOCIDAS.has(label.toLowerCase())) continue
      const ind = indicadorPorLabel.get(label)
      if (!ind) { advertencias.push(`Columna "${label}" no reconocida — se ignora.`); continue }
      colIndicador.set(c, { id: ind.id, puntaje_max: ind.puntaje_max })
    }

    const estudiantePorCodigo = new Map(ctx.estudiantes.map(e => [e.codigo.trim().toLowerCase(), e]))

    const errores: string[] = []
    const cambios: Array<{ indicador_id: string; estudiante_id: string; puntaje: number | null }> = []

    for (let r = headerRowIdx + 1; r < filas.length; r++) {
      const fila = filas[r]!
      const codigoRaw = String(fila[codigoColIdx] ?? '').trim()
      if (!codigoRaw) continue // fila vacía

      const est = estudiantePorCodigo.get(codigoRaw.toLowerCase())
      if (!est) { advertencias.push(`Fila ${r + 1}: código "${codigoRaw}" no reconocido — se omite.`); continue }
      if (est.estado !== 'ACTIVO') { advertencias.push(`Fila ${r + 1} (${est.apellido}, ${est.nombre}): estudiante no activo — se omite.`); continue }

      for (const [c, ind] of colIndicador) {
        const raw = String(fila[c] ?? '').trim()
        if (raw === '') { cambios.push({ indicador_id: ind.id, estudiante_id: est.id, puntaje: null }); continue }

        const puntaje = Number(raw)
        if (!Number.isInteger(puntaje) || puntaje < 1 || puntaje > ind.puntaje_max) {
          errores.push(`Fila ${r + 1} (${est.apellido}, ${est.nombre}) / "${headerRow[c]}": "${raw}" debe ser un entero entre 1 y ${ind.puntaje_max}.`)
          continue
        }
        cambios.push({ indicador_id: ind.id, estudiante_id: est.id, puntaje })
      }
    }

    if (errores.length > 0) {
      return { ok: false, actualizadas: 0, advertencias, errores }
    }

    await prisma.$transaction(
      cambios.map(c =>
        c.puntaje === null
          ? prisma.notaIndicador.deleteMany({ where: { indicador_id: c.indicador_id, estudiante_id: c.estudiante_id } })
          : prisma.notaIndicador.upsert({
              where: { indicador_id_estudiante_id: { indicador_id: c.indicador_id, estudiante_id: c.estudiante_id } },
              create: { indicador_id: c.indicador_id, estudiante_id: c.estudiante_id, puntaje: c.puntaje },
              update: { puntaje: c.puntaje },
            }),
      ),
    )

    return { ok: true, actualizadas: cambios.length, advertencias, errores: [] }
  }
}
