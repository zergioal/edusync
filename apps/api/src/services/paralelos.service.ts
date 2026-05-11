import { prisma } from '@edusync/database'
import { AppError } from '../middlewares/errorHandler'

export class ParalelosService {
  async findAll(institucion_id: string, gestion_id?: string, grado_id?: string) {
    // Si no se pasa gestion_id, usar la gestión activa para el conteo
    let gestId = gestion_id
    if (!gestId) {
      const gestion = await prisma.gestion.findFirst({
        where: { institucion_id, activa: true },
      })
      gestId = gestion?.id
    }

    return prisma.paralelo.findMany({
      where: {
        activo: true,
        grado:  { nivel: { institucion_id }, ...(grado_id ? { id: grado_id } : {}) },
      },
      include: {
        grado: { include: { nivel: true } },
        asesor: {
          include: {
            usuario: { select: { nombre: true, apellido: true } },
          },
        },
        _count: {
          select: {
            matriculas: gestId ? { where: { gestion_id: gestId } } : true,
          },
        },
      },
      orderBy: [
        { grado: { nivel: { nombre: 'asc' } } },
        { grado: { orden: 'asc' } },
        { letra: 'asc' },
      ],
    })
  }

  async findOne(id: string) {
    const p = await prisma.paralelo.findUnique({
      where:   { id },
      include: { grado: { include: { nivel: true } }, asesor: true },
    })
    if (!p) throw new AppError(404, 'Paralelo no encontrado', 'NOT_FOUND')
    return p
  }

  create(data: { grado_id: string; letra: string; asesor_id?: string }) {
    return prisma.paralelo.create({
      data:    { ...data, activo: true },
      include: { grado: { include: { nivel: true } } },
    })
  }

  async update(id: string, data: Partial<{ letra: string; asesor_id: string | null; activo: boolean }>) {
    await this.findOne(id)
    return prisma.paralelo.update({ where: { id }, data })
  }

  async deactivate(id: string) {
    await this.findOne(id)
    return prisma.paralelo.update({ where: { id }, data: { activo: false } })
  }
}
