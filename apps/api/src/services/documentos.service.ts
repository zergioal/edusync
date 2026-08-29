import { prisma } from '@edusync/database'
import { AppError } from '../middlewares/errorHandler'

/** Lista fija de documentos requeridos por estudiante — ajustable a futuro. */
export const TIPOS_DOCUMENTO = [
  'Certificado de Nacimiento',
  'Fotocopia de CI del estudiante',
  'Fotocopia de CI del padre/tutor',
  'Certificado de notas / libreta anterior',
  'Fotografías',
  'RUDE',
] as const

export class DocumentosService {
  /** Trae el checklist del estudiante, creando perezosamente las filas que falten. */
  async getChecklist(estudiante_id: string) {
    const estudiante = await prisma.estudiante.findUnique({ where: { id: estudiante_id } })
    if (!estudiante) throw new AppError(404, 'Estudiante no encontrado', 'NOT_FOUND')

    const existentes = await prisma.documentoEstudiante.findMany({ where: { estudiante_id } })
    const existentesTipos = new Set(existentes.map(d => d.tipo))
    const faltantes = TIPOS_DOCUMENTO.filter(t => !existentesTipos.has(t))

    if (faltantes.length > 0) {
      await prisma.documentoEstudiante.createMany({
        data: faltantes.map(tipo => ({ estudiante_id, tipo })),
        skipDuplicates: true,
      })
    }

    return prisma.documentoEstudiante.findMany({
      where: { estudiante_id },
      orderBy: { tipo: 'asc' },
    })
  }

  async toggle(estudiante_id: string, tipo: string, entregado: boolean, observacion?: string) {
    if (!TIPOS_DOCUMENTO.includes(tipo as typeof TIPOS_DOCUMENTO[number])) {
      throw new AppError(400, 'Tipo de documento inválido', 'INVALID_TIPO')
    }
    return prisma.documentoEstudiante.upsert({
      where: { estudiante_id_tipo: { estudiante_id, tipo } },
      create: {
        estudiante_id, tipo, entregado,
        fecha_entrega: entregado ? new Date() : null,
        ...(observacion !== undefined ? { observacion } : {}),
      },
      update: {
        entregado,
        fecha_entrega: entregado ? new Date() : null,
        ...(observacion !== undefined ? { observacion } : {}),
      },
    })
  }

  /** Reporte: estudiantes con al menos un documento pendiente. */
  async getReportePendientes(gestion_id: string, paralelo_id?: string) {
    const matriculas = await prisma.matricula.findMany({
      where: { gestion_id, ...(paralelo_id ? { paralelo_id } : {}) },
      include: {
        estudiante: { include: { usuario: { select: { nombre: true, apellido: true } } } },
        paralelo:   { include: { grado: { include: { nivel: true } } } },
      },
      orderBy: [
        { estudiante: { usuario: { apellido: 'asc' } } },
        { estudiante: { usuario: { nombre:   'asc' } } },
      ],
    })

    const estudianteIds = matriculas.map(m => m.estudiante_id)
    const docs = estudianteIds.length > 0
      ? await prisma.documentoEstudiante.findMany({ where: { estudiante_id: { in: estudianteIds } } })
      : []
    const docsPorEstudiante = new Map<string, typeof docs>()
    for (const d of docs) {
      if (!docsPorEstudiante.has(d.estudiante_id)) docsPorEstudiante.set(d.estudiante_id, [])
      docsPorEstudiante.get(d.estudiante_id)!.push(d)
    }

    const resultado = matriculas.map(m => {
      const propios = docsPorEstudiante.get(m.estudiante_id) ?? []
      const entregadosTipos = new Set(propios.filter(d => d.entregado).map(d => d.tipo))
      const pendientes = TIPOS_DOCUMENTO.filter(t => !entregadosTipos.has(t))
      return {
        estudiante_id: m.estudiante_id,
        nombre:        m.estudiante.usuario.nombre,
        apellido:      m.estudiante.usuario.apellido,
        codigo:        m.estudiante.codigo,
        nivel:         m.paralelo.grado.nivel.nombre,
        grado:         m.paralelo.grado.nombre,
        paralelo:      m.paralelo.letra,
        pendientes,
        total_pendientes: pendientes.length,
      }
    }).filter(r => r.total_pendientes > 0)

    return { total_tipos: TIPOS_DOCUMENTO.length, estudiantes: resultado }
  }
}
