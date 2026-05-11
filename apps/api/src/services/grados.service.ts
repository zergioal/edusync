import { prisma } from '@edusync/database'

export class GradosService {
  findAll(institucion_id: string, nivel_id?: string) {
    return prisma.grado.findMany({
      where: {
        nivel: {
          institucion_id,
          ...(nivel_id ? { id: nivel_id } : {}),
        },
      },
      include: { nivel: true },
      orderBy: [{ nivel: { nombre: 'asc' } }, { orden: 'asc' }],
    })
  }
}
