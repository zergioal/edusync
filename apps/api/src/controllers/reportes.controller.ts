import type { Request, Response, NextFunction } from 'express'
import type { EstadoEstudiante } from '@edusync/types'
import { ReportesService } from '../services/reportes.service'
import { DocentesService } from '../services/docentes.service'
import { AppError }        from '../middlewares/errorHandler'
import { generarHTMLCentralizador } from '../templates/centralizador.template'
import { generarHTMLCuadroHonor }   from '../templates/cuadro-honor.template'
import { generarHTMLTablaSimple, type DatosTablaSimple, type ColumnaTabla } from '../templates/reporte-tabla.template'
import { generarHTMLFichaEstudiante } from '../templates/ficha-estudiante.template'
import { generatePDF, generatePDFLandscape } from '../utils/pdf.generator'
import { generateCentralizadorExcel, generateTablaSimpleExcel } from '../utils/excel.generator'
import { getInstitucionInfo } from '../utils/institucion.util'

const NIVEL_ORDEN: Record<string, number> = { INICIAL: 0, PRIMARIA: 1, SECUNDARIA: 2 }

function abreviarCurso(gradoNombre: string, letra: string): string {
  const m = gradoNombre.match(/^(\d+°)\s+de\s+(Inicial|Primaria|Secundaria)$/)
  if (!m) return `${gradoNombre} ${letra}`
  const abbr = m[2] === 'Secundaria' ? 'Sec' : m[2] === 'Primaria' ? 'Pri' : 'Ini'
  return `${m[1]} ${abbr} ${letra}`
}

export class ReportesController {
  private service         = new ReportesService()
  private docentesService = new DocentesService()

  cuadroHonor = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { paralelo_id, trimestre_id } = req.query as Record<string, string>
      if (!paralelo_id || !trimestre_id) throw new AppError(400, 'paralelo_id y trimestre_id son requeridos', 'MISSING_PARAM')
      const data = await this.service.getCuadroHonor(paralelo_id, trimestre_id, req.auth!.institucion_id)
      res.json({ data })
    } catch (e) { next(e) }
  }

  cuadroHonorPdf = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { paralelo_id, trimestre_id } = req.query as Record<string, string>
      if (!paralelo_id || !trimestre_id) throw new AppError(400, 'paralelo_id y trimestre_id son requeridos', 'MISSING_PARAM')
      const data = await this.service.getCuadroHonor(paralelo_id, trimestre_id, req.auth!.institucion_id)
      const html = generarHTMLCuadroHonor(data)
      const pdf  = await generatePDFLandscape(html)
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', `attachment; filename="cuadro_honor_T${data.trimestre}.pdf"`)
      res.send(pdf)
    } catch (e) { next(e) }
  }

  centralizador = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { paralelo_id, trimestre_id } = req.query as Record<string, string>
      if (!paralelo_id || !trimestre_id) throw new AppError(400, 'paralelo_id y trimestre_id son requeridos', 'MISSING_PARAM')
      const data = await this.service.getCentralizador(paralelo_id, trimestre_id, req.auth!.institucion_id)
      res.json({ data })
    } catch (e) { next(e) }
  }

  centralizadorPdf = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { paralelo_id, trimestre_id } = req.query as Record<string, string>
      if (!paralelo_id || !trimestre_id) throw new AppError(400, 'paralelo_id y trimestre_id son requeridos', 'MISSING_PARAM')
      const data = await this.service.getCentralizador(paralelo_id, trimestre_id, req.auth!.institucion_id)
      const html = generarHTMLCentralizador(data)
      const pdf  = await generatePDFLandscape(html)
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', `attachment; filename="centralizador_T${data.trimestre}.pdf"`)
      res.send(pdf)
    } catch (e) { next(e) }
  }

  centralizadorExcel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { paralelo_id, trimestre_id } = req.query as Record<string, string>
      if (!paralelo_id || !trimestre_id) throw new AppError(400, 'paralelo_id y trimestre_id son requeridos', 'MISSING_PARAM')
      const data = await this.service.getCentralizador(paralelo_id, trimestre_id, req.auth!.institucion_id)
      const buf  = generateCentralizadorExcel(data)
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      res.setHeader('Content-Disposition', `attachment; filename="centralizador_${data.grado}_${data.paralelo}_T${data.trimestre}.xlsx"`)
      res.send(buf)
    } catch (e) { next(e) }
  }

  parciales = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { trimestre_id, paralelo_id } = req.query as Record<string, string>
      if (!trimestre_id || !paralelo_id) throw new AppError(400, 'trimestre_id y paralelo_id son requeridos', 'MISSING_PARAM')
      const data = await this.service.getParciales(trimestre_id, paralelo_id, req.auth!.institucion_id)
      res.json({ data })
    } catch (e) { next(e) }
  }

  carpetas = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { trimestre_id, paralelo_id } = req.query as Record<string, string>
      if (!trimestre_id || !paralelo_id) throw new AppError(400, 'trimestre_id y paralelo_id son requeridos', 'MISSING_PARAM')
      const data = await this.service.getCarpetasEntregables(trimestre_id, paralelo_id, req.auth!.institucion_id)
      res.json({ data })
    } catch (e) { next(e) }
  }

  promocionAnual = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { paralelo_id, gestion_id } = req.query as Record<string, string>
      if (!paralelo_id || !gestion_id) throw new AppError(400, 'paralelo_id y gestion_id son requeridos', 'MISSING_PARAM')
      const data = await this.service.getPromocionAnual(paralelo_id, gestion_id, req.auth!.institucion_id)
      res.json({ data })
    } catch (e) { next(e) }
  }

  // ── Reportes de Secretaría ───────────────────────────────────────────────

  private sendPdf(res: Response, tabla: DatosTablaSimple, filename: string) {
    return generatePDFLandscape(generarHTMLTablaSimple(tabla)).then(pdf => {
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`)
      res.send(pdf)
    })
  }

  private sendExcel(res: Response, tabla: DatosTablaSimple, filename: string) {
    const buf = generateTablaSimpleExcel(tabla)
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`)
    res.send(buf)
  }

  // Nómina de estudiantes ------------------------------------------------------

  private async nominaTabla(req: Request): Promise<DatosTablaSimple> {
    const { gestion_id, nivel_id, grado_id, paralelo_id } = req.query as Record<string, string>
    if (!gestion_id) throw new AppError(400, 'gestion_id es requerido', 'MISSING_PARAM')
    const [data, institucion] = await Promise.all([
      this.service.getNomina(req.auth!.institucion_id, gestion_id, nivel_id, grado_id, paralelo_id),
      getInstitucionInfo(req.auth!.institucion_id),
    ])
    return {
      institucion,
      titulo:    'Nómina de Estudiantes Inscritos',
      subtitulo: `Gestión ${data.anno} — ${data.estudiantes.length} estudiante(s)`,
      columnas: [
        { header: 'Código',   key: 'codigo' },
        { header: 'Apellido', key: 'apellido' },
        { header: 'Nombre',   key: 'nombre' },
        { header: 'Nivel',    key: 'nivel' },
        { header: 'Grado',    key: 'grado' },
        { header: 'Paralelo', key: 'paralelo', align: 'center' },
        { header: 'Estado',   key: 'estado', align: 'center' },
      ],
      filas: data.estudiantes,
    }
  }

  nomina = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { gestion_id, nivel_id, grado_id, paralelo_id } = req.query as Record<string, string>
      if (!gestion_id) throw new AppError(400, 'gestion_id es requerido', 'MISSING_PARAM')
      res.json({ data: await this.service.getNomina(req.auth!.institucion_id, gestion_id, nivel_id, grado_id, paralelo_id) })
    } catch (e) { next(e) }
  }
  nominaPdf = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { await this.sendPdf(res, await this.nominaTabla(req), 'nomina_estudiantes') } catch (e) { next(e) }
  }
  nominaExcel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { this.sendExcel(res, await this.nominaTabla(req), 'nomina_estudiantes') } catch (e) { next(e) }
  }

  // Listado de docentes ---------------------------------------------------------

  private async docentesListaTabla(req: Request): Promise<DatosTablaSimple> {
    const columnasPedidas = ((req.query['columnas'] as string) ?? '').split(',').filter(Boolean)
    const [docentes, institucion] = await Promise.all([
      this.docentesService.findAll(req.auth!.institucion_id),
      getInstitucionInfo(req.auth!.institucion_id),
    ])

    const columnas: ColumnaTabla[] = [
      { header: 'N°', key: 'n', align: 'center' },
      { header: 'Apellidos y Nombres', key: 'nombre' },
    ]
    if (columnasPedidas.includes('correo'))   columnas.push({ header: 'Correo', key: 'correo' })
    if (columnasPedidas.includes('materias')) columnas.push({ header: 'Materias asignadas', key: 'materias' })
    if (columnasPedidas.includes('horas'))    columnas.push({ header: 'Hs/mes', key: 'horas', align: 'center' })
    if (columnasPedidas.includes('cursos'))   columnas.push({ header: 'Cursos', key: 'cursos' })

    const filas = docentes.map((doc, idx) => {
      const materias = [...new Set(doc.asignaciones.map(a => a.materia?.nombre).filter(Boolean))].join(', ')

      const horas = doc.asignaciones.reduce((s, a) => {
        const ch = a.materia?.carga_horaria?.find(c => c.grado_id === a.paralelo?.grado?.id)
        return s + (ch?.horas_mes ?? a.materia?.horas_semanales ?? 0)
      }, 0)

      const cursosMap = new Map<string, { label: string; nivelOrden: number; gradoOrden: number; letra: string }>()
      for (const a of doc.asignaciones) {
        const grado = a.paralelo?.grado
        if (!grado) continue
        const key = `${grado.id}-${a.paralelo.letra}`
        if (cursosMap.has(key)) continue
        const nivel = grado.nivel?.nombre ?? ''
        cursosMap.set(key, {
          label:      abreviarCurso(grado.nombre, a.paralelo.letra),
          nivelOrden: NIVEL_ORDEN[nivel] ?? 99,
          gradoOrden: grado.orden,
          letra:      a.paralelo.letra,
        })
      }
      const cursos = [...cursosMap.values()]
        .sort((a, b) => a.nivelOrden - b.nivelOrden || a.gradoOrden - b.gradoOrden || a.letra.localeCompare(b.letra))
        .map(c => c.label)
        .join(', ')

      return {
        n:        idx + 1,
        nombre:   `${doc.usuario.apellido}, ${doc.usuario.nombre}`,
        correo:   doc.usuario.email,
        materias,
        horas,
        cursos,
      }
    })

    return {
      institucion,
      titulo:    'Listado de Docentes',
      subtitulo: `${docentes.length} docente(s)`,
      columnas,
      filas,
    }
  }

  docentesListaPdf = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { await this.sendPdf(res, await this.docentesListaTabla(req), 'listado_docentes') } catch (e) { next(e) }
  }
  docentesListaExcel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { this.sendExcel(res, await this.docentesListaTabla(req), 'listado_docentes') } catch (e) { next(e) }
  }

  // ── Reportes de BTH ──────────────────────────────────────────────────────────

  listaTecnica = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { paralelo_id, gestion_id } = req.query as Record<string, string>
      if (!paralelo_id || !gestion_id) throw new AppError(400, 'paralelo_id y gestion_id son requeridos', 'MISSING_PARAM')
      const data = await this.service.getListaTecnica(paralelo_id, gestion_id, req.auth!.institucion_id)
      res.json({ data })
    } catch (e) { next(e) }
  }
  listaTecnicaPdf = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { await this.sendPdf(res, await this.listaTecnicaTabla(req), 'lista_tecnica_bth') } catch (e) { next(e) }
  }
  listaTecnicaExcel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { this.sendExcel(res, await this.listaTecnicaTabla(req), 'lista_tecnica_bth') } catch (e) { next(e) }
  }

  private async listaTecnicaTabla(req: Request): Promise<DatosTablaSimple> {
    const { paralelo_id, gestion_id } = req.query as Record<string, string>
    if (!paralelo_id || !gestion_id) throw new AppError(400, 'paralelo_id y gestion_id son requeridos', 'MISSING_PARAM')
    const [data, institucion] = await Promise.all([
      this.service.getListaTecnica(paralelo_id, gestion_id, req.auth!.institucion_id),
      getInstitucionInfo(req.auth!.institucion_id),
    ])
    return {
      institucion,
      titulo:    'Estudiantes que cursan / no cursan BTH',
      subtitulo: data.curso,
      columnas: [
        { header: 'Código',    key: 'codigo' },
        { header: 'Apellido',  key: 'apellido' },
        { header: 'Nombre',    key: 'nombre' },
        { header: 'Cursa BTH', key: 'cursa', align: 'center' },
      ],
      filas: [
        ...data.cursan.map(e => ({ ...e, cursa: 'Sí' })),
        ...data.no_cursan.map(e => ({ ...e, cursa: 'No' })),
      ],
    }
  }

  notasSubareas = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { paralelo_id, trimestre_id } = req.query as Record<string, string>
      if (!paralelo_id || !trimestre_id) throw new AppError(400, 'paralelo_id y trimestre_id son requeridos', 'MISSING_PARAM')
      const data = await this.service.getNotasSubareas(paralelo_id, trimestre_id, req.auth!.institucion_id)
      res.json({ data })
    } catch (e) { next(e) }
  }
  notasSubareasPdf = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { await this.sendPdf(res, await this.notasSubareasTabla(req), 'notas_subareas_bth') } catch (e) { next(e) }
  }
  notasSubareasExcel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { this.sendExcel(res, await this.notasSubareasTabla(req), 'notas_subareas_bth') } catch (e) { next(e) }
  }

  private async notasSubareasTabla(req: Request): Promise<DatosTablaSimple> {
    const { paralelo_id, trimestre_id } = req.query as Record<string, string>
    if (!paralelo_id || !trimestre_id) throw new AppError(400, 'paralelo_id y trimestre_id son requeridos', 'MISSING_PARAM')
    const [data, institucion] = await Promise.all([
      this.service.getNotasSubareas(paralelo_id, trimestre_id, req.auth!.institucion_id),
      getInstitucionInfo(req.auth!.institucion_id),
    ])
    return {
      institucion,
      titulo:    'Notas de Subáreas — BTH',
      subtitulo: data.curso,
      columnas: [
        { header: 'Código',   key: 'codigo' },
        { header: 'Apellido', key: 'apellido' },
        { header: 'Nombre',   key: 'nombre' },
        ...data.subareas.map((nombre, i) => ({ header: nombre, key: `sub_${i}`, align: 'center' as const })),
        { header: 'Promedio', key: 'promedio', align: 'center' as const },
      ],
      filas: data.estudiantes.map(e => ({
        codigo: e.codigo, apellido: e.apellido, nombre: e.nombre,
        ...Object.fromEntries(e.notasSubareas.map((n, i) => [`sub_${i}`, n.total])),
        promedio: e.promedio,
      })),
    }
  }

  // Ficha individual ------------------------------------------------------------

  fichaEstudiante = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.json({ data: await this.service.getFichaEstudiante(req.params['estudiante_id']!, req.auth!.institucion_id) })
    } catch (e) { next(e) }
  }
  fichaEstudiantePdf = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const [data, institucion] = await Promise.all([
        this.service.getFichaEstudiante(req.params['estudiante_id']!, req.auth!.institucion_id),
        getInstitucionInfo(req.auth!.institucion_id),
      ])
      const pdf = await generatePDF(generarHTMLFichaEstudiante({ ...data, institucion }))
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', `attachment; filename="ficha_${data.datos_personales.codigo}.pdf"`)
      res.send(pdf)
    } catch (e) { next(e) }
  }

  // Estado de matrícula (activos/retirados/trasladados) -------------------------

  private async estadoMatriculaTabla(req: Request): Promise<DatosTablaSimple> {
    const { gestion_id, estado } = req.query as Record<string, string>
    if (!gestion_id) throw new AppError(400, 'gestion_id es requerido', 'MISSING_PARAM')
    const [data, institucion] = await Promise.all([
      this.service.getEstudiantesPorEstado(req.auth!.institucion_id, gestion_id, estado as EstadoEstudiante | undefined),
      getInstitucionInfo(req.auth!.institucion_id),
    ])
    return {
      institucion,
      titulo:    'Estudiantes por Estado de Matrícula',
      subtitulo: `Activos: ${data.resumen.ACTIVO} · Retirados: ${data.resumen.RETIRADO} · Trasladados: ${data.resumen.TRASLADADO}`,
      columnas: [
        { header: 'Código',   key: 'codigo' },
        { header: 'Apellido', key: 'apellido' },
        { header: 'Nombre',   key: 'nombre' },
        { header: 'Nivel',    key: 'nivel' },
        { header: 'Grado',    key: 'grado' },
        { header: 'Paralelo', key: 'paralelo', align: 'center' },
        { header: 'Estado',   key: 'estado', align: 'center' },
      ],
      filas: data.estudiantes,
    }
  }

  estadoMatricula = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { gestion_id, estado } = req.query as Record<string, string>
      if (!gestion_id) throw new AppError(400, 'gestion_id es requerido', 'MISSING_PARAM')
      res.json({ data: await this.service.getEstudiantesPorEstado(req.auth!.institucion_id, gestion_id, estado as EstadoEstudiante | undefined) })
    } catch (e) { next(e) }
  }
  estadoMatriculaPdf = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { await this.sendPdf(res, await this.estadoMatriculaTabla(req), 'estado_matricula') } catch (e) { next(e) }
  }
  estadoMatriculaExcel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { this.sendExcel(res, await this.estadoMatriculaTabla(req), 'estado_matricula') } catch (e) { next(e) }
  }

  // Estadística de matrícula -----------------------------------------------------

  estadisticaMatricula = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { gestion_id } = req.query as Record<string, string>
      if (!gestion_id) throw new AppError(400, 'gestion_id es requerido', 'MISSING_PARAM')
      res.json({ data: await this.service.getEstadisticaMatricula(req.auth!.institucion_id, gestion_id) })
    } catch (e) { next(e) }
  }

  private async estadisticaMatriculaTabla(req: Request): Promise<DatosTablaSimple> {
    const { gestion_id } = req.query as Record<string, string>
    if (!gestion_id) throw new AppError(400, 'gestion_id es requerido', 'MISSING_PARAM')
    const [data, institucion] = await Promise.all([
      this.service.getEstadisticaMatricula(req.auth!.institucion_id, gestion_id),
      getInstitucionInfo(req.auth!.institucion_id),
    ])
    return {
      institucion,
      titulo:    'Estadística de Matrícula por Grado y Paralelo',
      subtitulo: `Gestión ${data.anno} — Total: ${data.total} · M: ${data.por_sexo['M'] ?? 0} · F: ${data.por_sexo['F'] ?? 0} · Sin registrar: ${data.por_sexo['Sin registrar'] ?? 0}`,
      columnas: [
        { header: 'Nivel',    key: 'nivel' },
        { header: 'Grado',    key: 'grado' },
        { header: 'Paralelo', key: 'paralelo', align: 'center' },
        { header: 'Total',    key: 'total', align: 'center' },
      ],
      filas: data.por_grado_paralelo,
    }
  }
  estadisticaMatriculaPdf = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { await this.sendPdf(res, await this.estadisticaMatriculaTabla(req), 'estadistica_matricula') } catch (e) { next(e) }
  }
  estadisticaMatriculaExcel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { this.sendExcel(res, await this.estadisticaMatriculaTabla(req), 'estadistica_matricula') } catch (e) { next(e) }
  }

  // Padres / tutores --------------------------------------------------------------

  private async padresTutoresTabla(req: Request): Promise<DatosTablaSimple> {
    const { gestion_id, paralelo_id } = req.query as Record<string, string>
    if (!gestion_id) throw new AppError(400, 'gestion_id es requerido', 'MISSING_PARAM')
    const [filas, institucion] = await Promise.all([
      this.service.getPadresTutores(req.auth!.institucion_id, gestion_id, paralelo_id),
      getInstitucionInfo(req.auth!.institucion_id),
    ])
    return {
      institucion,
      titulo:   'Padres, Madres y Tutores',
      subtitulo: `${filas.length} registro(s)`,
      columnas: [
        { header: 'Estudiante', key: 'estudiante' },
        { header: 'Código',     key: 'codigo' },
        { header: 'Nivel',      key: 'nivel' },
        { header: 'Grado',      key: 'grado' },
        { header: 'Paralelo',   key: 'paralelo', align: 'center' },
        { header: 'Tutor',      key: 'tutor' },
        { header: 'Correo',     key: 'email' },
        { header: 'Teléfono',   key: 'telefono' },
      ],
      filas,
    }
  }

  padresTutores = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { gestion_id, paralelo_id } = req.query as Record<string, string>
      if (!gestion_id) throw new AppError(400, 'gestion_id es requerido', 'MISSING_PARAM')
      res.json({ data: await this.service.getPadresTutores(req.auth!.institucion_id, gestion_id, paralelo_id) })
    } catch (e) { next(e) }
  }
  padresTutoresPdf = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { await this.sendPdf(res, await this.padresTutoresTabla(req), 'padres_tutores') } catch (e) { next(e) }
  }
  padresTutoresExcel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { this.sendExcel(res, await this.padresTutoresTabla(req), 'padres_tutores') } catch (e) { next(e) }
  }
}
