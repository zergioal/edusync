import { prisma } from '@edusync/database'
import { AppError } from '../middlewares/errorHandler'

export const TIPOS_CERTIFICADO = [
  'Constancia de Estudio',
  'Certificado de Notas',
  'Historial Académico',
  'Certificado de Conducta',
  'Otro',
] as const

export class CertificadosService {
  async create(data: {
    estudiante_id: string
    tipo: string
    tipo_otro?: string
    observacion?: string
    emitido_por_id: string
  }) {
    const estudiante = await prisma.estudiante.findUnique({ where: { id: data.estudiante_id } })
    if (!estudiante) throw new AppError(404, 'Estudiante no encontrado', 'NOT_FOUND')

    if (data.tipo === 'Otro' && !data.tipo_otro?.trim()) {
      throw new AppError(400, 'Debes especificar el tipo de certificado', 'VALIDATION')
    }
    const tipoFinal = data.tipo === 'Otro' ? data.tipo_otro!.trim() : data.tipo

    return prisma.certificadoEmitido.create({
      data: {
        estudiante_id:  data.estudiante_id,
        tipo:           tipoFinal,
        emitido_por_id: data.emitido_por_id,
        ...(data.observacion ? { observacion: data.observacion } : {}),
      },
      include: { emitido_por: { select: { nombre: true, apellido: true } } },
    })
  }

  async listByEstudiante(estudiante_id: string) {
    return prisma.certificadoEmitido.findMany({
      where: { estudiante_id },
      include: { emitido_por: { select: { nombre: true, apellido: true } } },
      orderBy: { fecha_emision: 'desc' },
    })
  }

  async remove(id: string) {
    const cert = await prisma.certificadoEmitido.findUnique({ where: { id } })
    if (!cert) throw new AppError(404, 'Certificado no encontrado', 'NOT_FOUND')
    await prisma.certificadoEmitido.delete({ where: { id } })
  }

  async listGlobal(filters: { institucion_id: string; tipo?: string; desde?: string; hasta?: string }) {
    const where: Record<string, unknown> = {
      estudiante: { usuario: { institucion_id: filters.institucion_id } },
      ...(filters.tipo ? { tipo: filters.tipo } : {}),
    }
    if (filters.desde || filters.hasta) {
      where['fecha_emision'] = {
        ...(filters.desde ? { gte: new Date(filters.desde) } : {}),
        ...(filters.hasta ? { lte: new Date(filters.hasta) } : {}),
      }
    }

    const certificados = await prisma.certificadoEmitido.findMany({
      where,
      include: {
        estudiante:  { include: { usuario: { select: { nombre: true, apellido: true } } } },
        emitido_por: { select: { nombre: true, apellido: true } },
      },
      orderBy: { fecha_emision: 'desc' },
    })

    return certificados.map(c => ({
      id:            c.id,
      tipo:          c.tipo,
      fecha_emision: c.fecha_emision,
      estudiante:    `${c.estudiante.usuario.apellido} ${c.estudiante.usuario.nombre}`,
      codigo:        c.estudiante.codigo,
      emitido_por:   `${c.emitido_por.apellido} ${c.emitido_por.nombre}`,
      observacion:   c.observacion,
    }))
  }
}
