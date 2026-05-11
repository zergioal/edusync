import { prisma } from '@edusync/database'
import { AppError } from '../middlewares/errorHandler'

export class MateriasService {
  findAll(institucion_id: string, nivel_id?: string) {
    return prisma.materia.findMany({
      where: {
        activa: true,
        nivel:  { institucion_id, ...(nivel_id ? { id: nivel_id } : {}) },
      },
      include: { campo: true, nivel: true },
      orderBy: [{ campo: { nombre: 'asc' } }, { nombre: 'asc' }],
    })
  }

  /** Materias disponibles para asignar a un paralelo dado, filtradas por tipo_ue */
  async findDisponibles(institucion_id: string, paralelo_id: string) {
    const paralelo = await prisma.paralelo.findUnique({
      where:   { id: paralelo_id },
      include: { grado: { include: { nivel: true } } },
    })
    if (!paralelo) throw new AppError(404, 'Paralelo no encontrado', 'NOT_FOUND')

    const inst = await prisma.institucion.findUnique({ where: { id: institucion_id } })
    if (!inst) throw new AppError(404, 'Institución no encontrada', 'NOT_FOUND')

    const gradoOrden = paralelo.grado.orden
    const esBTH      = inst.tipo_ue === 'BTH'

    return prisma.materia.findMany({
      where: {
        activa:   true,
        nivel_id: paralelo.grado.nivel_id,
        // Si la institución NO es BTH, excluir materias BTH
        ...(!esBTH ? { solo_si_bth: false } : {}),
        // Respetar rangos de aplicación por grado
        OR: [
          { aplica_solo_desde_grado: null,   aplica_hasta_grado: null   },
          { aplica_solo_desde_grado: { lte: gradoOrden }, aplica_hasta_grado: null },
          { aplica_solo_desde_grado: null,   aplica_hasta_grado: { gte: gradoOrden } },
          { aplica_solo_desde_grado: { lte: gradoOrden }, aplica_hasta_grado: { gte: gradoOrden } },
        ],
      },
      include: {
        campo:        true,
        nivel:        true,
        carga_horaria: {
          where: { grado_id: paralelo.grado_id },
          select: { horas_mes: true },
        },
      },
      orderBy: [{ campo: { nombre: 'asc' } }, { nombre: 'asc' }],
    })
  }

  async findCargaHoraria(institucion_id: string, nivel_id: string) {
    const nivel = await prisma.nivel.findFirst({ where: { id: nivel_id, institucion_id } })
    if (!nivel) throw new AppError(404, 'Nivel no encontrado', 'NOT_FOUND')

    const grados   = await prisma.grado.findMany({ where: { nivel_id }, orderBy: { orden: 'asc' } })
    const materias = await prisma.materia.findMany({
      where:   { nivel_id, activa: true },
      include: { campo: true, carga_horaria: { include: { grado: true } } },
      orderBy: [{ campo: { nombre: 'asc' } }, { nombre: 'asc' }],
    })

    return { grados, materias }
  }

  async updateCargaHoraria(entries: { materia_id: string; grado_id: string; horas_mes: number }[]) {
    for (const e of entries) {
      await prisma.cargaHorariaMateria.upsert({
        where:  { materia_id_grado_id: { materia_id: e.materia_id, grado_id: e.grado_id } },
        create: { materia_id: e.materia_id, grado_id: e.grado_id, horas_mes: e.horas_mes },
        update: { horas_mes: e.horas_mes },
      })
    }
  }
}
