import { prisma } from '@edusync/database'
import { AppError } from '../middlewares/errorHandler'

export class MatriculasService {
  async findAll(filters: { gestion_id?: string; paralelo_id?: string }) {
    return prisma.matricula.findMany({
      where: {
        ...(filters.gestion_id  ? { gestion_id:  filters.gestion_id  } : {}),
        ...(filters.paralelo_id ? { paralelo_id: filters.paralelo_id } : {}),
      },
      include: {
        estudiante: {
          include: {
            usuario: { select: { nombre: true, apellido: true, email: true } },
          },
        },
        paralelo: { include: { grado: { include: { nivel: true } } } },
        gestion:  { select: { anno: true } },
      },
      orderBy: [
        { estudiante: { usuario: { apellido: 'asc' } } },
        { estudiante: { usuario: { nombre:   'asc' } } },
      ],
    })
  }

  async create(data: { estudiante_id: string; paralelo_id: string; gestion_id: string }) {
    const existing = await prisma.matricula.findFirst({
      where: { estudiante_id: data.estudiante_id, gestion_id: data.gestion_id },
    })
    if (existing) {
      throw new AppError(409, 'El estudiante ya está matriculado en esta gestión', 'ALREADY_ENROLLED')
    }
    return prisma.matricula.create({
      data,
      include: {
        estudiante: { include: { usuario: { select: { nombre: true, apellido: true } } } },
        paralelo:   { include: { grado: { include: { nivel: true } } } },
        gestion:    { select: { anno: true } },
      },
    })
  }
}
