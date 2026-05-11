import { prisma } from '@edusync/database'
import { AppError } from '../middlewares/errorHandler'

export class InstitucionesService {
  findAll() {
    return prisma.institucion.findMany({ orderBy: { nombre: 'asc' } })
  }

  async findOne(id: string) {
    const inst = await prisma.institucion.findUnique({ where: { id } })
    if (!inst) throw new AppError(404, 'Institución no encontrada', 'NOT_FOUND')
    return inst
  }

  create(data: { nombre: string; subdominio: string; logo_url?: string }) {
    return prisma.institucion.create({ data })
  }

  async update(id: string, data: Partial<{ nombre: string; logo_url: string; activa: boolean }>) {
    await this.findOne(id)
    return prisma.institucion.update({ where: { id }, data })
  }
}
