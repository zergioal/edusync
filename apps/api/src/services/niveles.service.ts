import { prisma } from '@edusync/database'

export class NivelesService {
  findAll(institucion_id: string) {
    return prisma.nivel.findMany({
      where:   { institucion_id },
      orderBy: { nombre: 'asc' },
    })
  }
}
