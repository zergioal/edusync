import { prisma } from '@edusync/database'
import { AppError } from '../middlewares/errorHandler'

export class TarifasService {
  async findByGestion(institucion_id: string, gestion_id: string) {
    // Verificar que la gestión pertenezca a la institución
    const gestion = await prisma.gestion.findFirst({ where: { id: gestion_id, institucion_id } })
    if (!gestion) throw new AppError(404, 'Gestión no encontrada', 'NOT_FOUND')

    const tarifas = await prisma.tarifaPension.findMany({
      where:   { gestion_id },
      include: { nivel: true },
      orderBy: { nivel: { nombre: 'asc' } },
    })

    // Si no hay tarifas para esta gestión, buscar la gestión anterior como sugerencia
    if (tarifas.length === 0) {
      const gestionAnterior = await prisma.gestion.findFirst({
        where:   { institucion_id, anno: { lt: gestion.anno } },
        orderBy: { anno: 'desc' },
      })
      if (gestionAnterior) {
        const anteriores = await prisma.tarifaPension.findMany({
          where:   { gestion_id: gestionAnterior.id },
          include: { nivel: true },
          orderBy: { nivel: { nombre: 'asc' } },
        })
        if (anteriores.length > 0) {
          return {
            tarifas:    anteriores.map(t => this.formatTarifa(t, gestion_id, true)),
            sugeridas:  true,
            gestion_anno_sugerida: gestionAnterior.anno,
          }
        }
      }
      return { tarifas: [], sugeridas: false, gestion_anno_sugerida: null }
    }

    // Obtener conteo de estudiantes por nivel matriculados en la gestión
    const conteoNiveles = await this.conteoPorNivel(gestion_id)
    const becadosCount  = await prisma.estudiante.count({
      where: { becado: true, matriculas: { some: { gestion_id } } },
    })

    return {
      tarifas:    tarifas.map(t => ({
        ...this.formatTarifa(t, gestion_id, false),
        estudiantes_count: conteoNiveles[t.nivel_id] ?? 0,
      })),
      sugeridas:     false,
      becados_count: becadosCount,
      gestion_anno_sugerida: null,
    }
  }

  async upsertBatch(institucion_id: string, gestion_id: string, items: { nivel_id: string; monto: number }[]) {
    const gestion = await prisma.gestion.findFirst({ where: { id: gestion_id, institucion_id } })
    if (!gestion) throw new AppError(404, 'Gestión no encontrada', 'NOT_FOUND')

    const results = await Promise.all(
      items.map(item =>
        prisma.tarifaPension.upsert({
          where:  { gestion_id_nivel_id: { gestion_id, nivel_id: item.nivel_id } },
          create: { institucion_id, gestion_id, nivel_id: item.nivel_id, monto: item.monto },
          update: { monto: item.monto },
          include: { nivel: true },
        })
      )
    )

    return results.map(t => this.formatTarifa(t, gestion_id, false))
  }

  private formatTarifa(t: { id: string; nivel_id: string; nivel: { nombre: string }; monto: unknown }, gestion_id: string, sugerida: boolean) {
    return {
      id:           t.id,
      nivel_id:     t.nivel_id,
      nivel_nombre: String(t.nivel.nombre),
      monto:        Number(t.monto),
      gestion_id,
      sugerida,
    }
  }

  private async conteoPorNivel(gestion_id: string): Promise<Record<string, number>> {
    // Obtener matriculas con nivel a través de paralelo → grado → nivel
    const matriculas = await prisma.matricula.findMany({
      where:   { gestion_id },
      include: { paralelo: { include: { grado: { include: { nivel: true } } } } },
    })
    const conteo: Record<string, number> = {}
    for (const m of matriculas) {
      const nivelId = m.paralelo.grado.nivel_id
      conteo[nivelId] = (conteo[nivelId] ?? 0) + 1
    }
    return conteo
  }
}
