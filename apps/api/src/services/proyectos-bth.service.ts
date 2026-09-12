import { prisma } from '@edusync/database'
import type { EstadoDefensaBTH } from '@prisma/client'
import { AppError } from '../middlewares/errorHandler'

const PROYECTO_INCLUDE = {
  estudiantes: {
    include: {
      estudiante: { include: { usuario: { select: { nombre: true, apellido: true } } } },
    },
  },
} as const

async function validarEstudiantesBTH(estudiante_ids: string[], gestion_id: string) {
  const matriculas = await prisma.matricula.findMany({
    where:   { estudiante_id: { in: estudiante_ids }, gestion_id },
    include: { paralelo: { include: { grado: { include: { nivel: true } } } } },
  })
  for (const id of estudiante_ids) {
    const mat = matriculas.find(m => m.estudiante_id === id)
    if (!mat) throw new AppError(400, `Un estudiante no está matriculado en esta gestión`, 'VALIDATION_ERROR')
    const esSexto = mat.paralelo.grado.nivel.nombre === 'SECUNDARIA' && mat.paralelo.grado.orden === 6
    if (!esSexto) throw new AppError(400, 'Los proyectos BTH son solo para estudiantes de 6to de Secundaria', 'VALIDATION_ERROR')
    if (!mat.lleva_tecnica) throw new AppError(400, 'El estudiante no cursa BTH (técnica especializada)', 'VALIDATION_ERROR')
  }
}

export class ProyectosBTHService {
  findAll(institucion_id: string, gestion_id: string) {
    return prisma.proyectoBTH.findMany({
      where:   { institucion_id, gestion_id },
      include: PROYECTO_INCLUDE,
      orderBy: { created_at: 'desc' },
    })
  }

  async create(institucion_id: string, data: { nombre: string; gestion_id: string; estudiante_ids: string[] }) {
    if (!data.estudiante_ids?.length) throw new AppError(400, 'Seleccioná al menos un estudiante', 'VALIDATION_ERROR')
    await validarEstudiantesBTH(data.estudiante_ids, data.gestion_id)

    try {
      return await prisma.proyectoBTH.create({
        data: {
          institucion_id, gestion_id: data.gestion_id, nombre: data.nombre,
          estudiantes: {
            create: data.estudiante_ids.map(estudiante_id => ({ estudiante_id, gestion_id: data.gestion_id })),
          },
        },
        include: PROYECTO_INCLUDE,
      })
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'code' in e && e.code === 'P2002') {
        throw new AppError(409, 'Uno de los estudiantes ya pertenece a otro proyecto BTH esta gestión', 'DUPLICATE_ENTRY')
      }
      throw e
    }
  }

  async update(
    id: string,
    data: {
      nombre?: string | undefined; porcentaje_avance?: number | undefined
      estado_defensa?: EstadoDefensaBTH | undefined; estudiante_ids?: string[] | undefined
    },
  ) {
    const proyecto = await prisma.proyectoBTH.findUnique({ where: { id } })
    if (!proyecto) throw new AppError(404, 'Proyecto no encontrado', 'NOT_FOUND')

    const { estudiante_ids } = data
    if (estudiante_ids !== undefined) await validarEstudiantesBTH(estudiante_ids, proyecto.gestion_id)

    const resto: { nombre?: string; porcentaje_avance?: number; estado_defensa?: EstadoDefensaBTH } = {}
    if (data.nombre             !== undefined) resto.nombre = data.nombre
    if (data.porcentaje_avance  !== undefined) resto.porcentaje_avance = data.porcentaje_avance
    if (data.estado_defensa     !== undefined) resto.estado_defensa = data.estado_defensa

    try {
      await prisma.$transaction([
        prisma.proyectoBTH.update({ where: { id }, data: resto }),
        ...(estudiante_ids !== undefined ? [
          prisma.proyectoBTHEstudiante.deleteMany({ where: { proyecto_id: id } }),
          prisma.proyectoBTHEstudiante.createMany({
            data: estudiante_ids.map(estudiante_id => ({ proyecto_id: id, estudiante_id, gestion_id: proyecto.gestion_id })),
          }),
        ] : []),
      ])
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'code' in e && e.code === 'P2002') {
        throw new AppError(409, 'Uno de los estudiantes ya pertenece a otro proyecto BTH esta gestión', 'DUPLICATE_ENTRY')
      }
      throw e
    }

    return prisma.proyectoBTH.findUniqueOrThrow({ where: { id }, include: PROYECTO_INCLUDE })
  }

  async remove(id: string) {
    const proyecto = await prisma.proyectoBTH.findUnique({ where: { id } })
    if (!proyecto) throw new AppError(404, 'Proyecto no encontrado', 'NOT_FOUND')
    await prisma.proyectoBTH.delete({ where: { id } })
  }

  private async proyectoDelEstudiante(estudiante_id: string) {
    const rel = await prisma.proyectoBTHEstudiante.findFirst({
      where:   { estudiante_id },
      include: { proyecto: { include: PROYECTO_INCLUDE } },
      orderBy: { proyecto: { created_at: 'desc' } },
    })
    return rel?.proyecto ?? null
  }

  async miProyecto(usuario_id: string) {
    const estudiante = await prisma.estudiante.findUnique({ where: { usuario_id } })
    if (!estudiante) throw new AppError(404, 'Estudiante no encontrado', 'NOT_FOUND')
    return this.proyectoDelEstudiante(estudiante.id)
  }

  async proyectoDeHijo(padre_usuario_id: string, estudiante_id: string) {
    const rel = await prisma.relacionPadreHijo.findFirst({ where: { padre_id: padre_usuario_id, estudiante_id } })
    if (!rel) throw new AppError(403, 'Sin acceso', 'FORBIDDEN')
    return this.proyectoDelEstudiante(estudiante_id)
  }
}
