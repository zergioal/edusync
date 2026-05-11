import { prisma } from '@edusync/database'
import { AppError } from '../middlewares/errorHandler'

const INCLUDE = {
  docente:  { include: { usuario: { select: { nombre: true, apellido: true } } } },
  materia:  { include: { campo: true, nivel: true } },
  paralelo: { include: { grado: { include: { nivel: true } } } },
  gestion:  true,
} as const

export class AsignacionesService {
  findAll(
    institucion_id: string,
    filters: { paralelo_id?: string; gestion_id?: string }
  ) {
    const { paralelo_id, gestion_id } = filters
    return prisma.asignacion.findMany({
      where: {
        ...(paralelo_id ? { paralelo_id } : {}),
        ...(gestion_id  ? { gestion_id  } : {}),
        docente: { usuario: { institucion_id } },
      },
      include: INCLUDE,
      orderBy: [
        { materia: { campo: { nombre: 'asc' } } },
        { materia: { nombre: 'asc' } },
      ],
    })
  }

  async create(data: {
    docente_id:  string
    materia_id:  string
    paralelo_id: string
    gestion_id:  string
  }) {
    const exists = await prisma.asignacion.findFirst({
      where: {
        docente_id:  data.docente_id,
        materia_id:  data.materia_id,
        paralelo_id: data.paralelo_id,
        gestion_id:  data.gestion_id,
      },
    })
    if (exists) throw new AppError(409, 'Ya existe una asignación con esa combinación', 'DUPLICATE')

    const paralelo = await prisma.paralelo.findUnique({
      where:   { id: data.paralelo_id },
      include: { grado: { include: { nivel: { include: { institucion: true } } } } },
    })
    if (!paralelo) throw new AppError(404, 'Paralelo no encontrado', 'NOT_FOUND')

    const materia = await prisma.materia.findUnique({ where: { id: data.materia_id } })
    if (!materia || !materia.activa) throw new AppError(404, 'Materia no encontrada', 'NOT_FOUND')

    const gradoOrden = paralelo.grado.orden
    const esBTH      = paralelo.grado.nivel.institucion.tipo_ue === 'BTH'

    if (materia.solo_si_bth && !esBTH) {
      throw new AppError(422, 'Esta materia solo aplica a instituciones BTH', 'VALIDATION')
    }
    if (materia.aplica_solo_desde_grado !== null && gradoOrden < materia.aplica_solo_desde_grado) {
      throw new AppError(422, 'Esta materia no aplica para este grado', 'VALIDATION')
    }
    if (materia.aplica_hasta_grado !== null && gradoOrden > materia.aplica_hasta_grado) {
      throw new AppError(422, 'Esta materia no aplica para este grado', 'VALIDATION')
    }

    const carga = await prisma.cargaHorariaMateria.findUnique({
      where: { materia_id_grado_id: { materia_id: data.materia_id, grado_id: paralelo.grado_id } },
    })
    const horas = carga?.horas_mes ?? 0

    return prisma.$transaction(async (tx) => {
      const asignacion = await tx.asignacion.create({ data, include: INCLUDE })
      if (horas > 0) {
        await tx.docente.update({
          where: { id: data.docente_id },
          data:  { horas_pedagogicas_total: { increment: horas } },
        })
      }
      return asignacion
    })
  }

  async findOne(id: string) {
    const a = await prisma.asignacion.findUnique({ where: { id }, include: INCLUDE })
    if (!a) throw new AppError(404, 'Asignación no encontrada', 'NOT_FOUND')
    return a
  }

  async findMias(usuario_id: string) {
    const docente = await prisma.docente.findUnique({ where: { usuario_id } })
    if (!docente) throw new AppError(404, 'Perfil de docente no encontrado', 'NOT_FOUND')

    const asignaciones = await prisma.asignacion.findMany({
      where:   { docente_id: docente.id },
      include: { ...INCLUDE, _count: { select: { indicadores: true } } },
      orderBy: [{ materia: { nombre: 'asc' } }],
    })

    return Promise.all(
      asignaciones.map(async a => ({
        ...a,
        n_estudiantes: await prisma.matricula.count({
          where: { paralelo_id: a.paralelo_id, gestion_id: a.gestion_id },
        }),
      }))
    )
  }

  async remove(id: string) {
    const a = await prisma.asignacion.findUnique({
      where:   { id },
      include: { paralelo: { include: { grado: true } } },
    })
    if (!a) throw new AppError(404, 'Asignación no encontrada', 'NOT_FOUND')

    const carga = await prisma.cargaHorariaMateria.findUnique({
      where: { materia_id_grado_id: { materia_id: a.materia_id, grado_id: a.paralelo.grado_id } },
    })
    const horas = carga?.horas_mes ?? 0

    await prisma.$transaction(async (tx) => {
      await tx.asignacion.delete({ where: { id } })
      if (horas > 0) {
        await tx.docente.update({
          where: { id: a.docente_id },
          data:  { horas_pedagogicas_total: { decrement: horas } },
        })
      }
    })
  }
}
