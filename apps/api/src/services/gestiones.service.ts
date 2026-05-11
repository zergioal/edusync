import { prisma } from '@edusync/database'
import { AppError } from '../middlewares/errorHandler'

export class GestionesService {
  findAll(institucion_id: string) {
    return prisma.gestion.findMany({
      where:   { institucion_id },
      include: { trimestres: { orderBy: { numero: 'asc' } } },
      orderBy: { anno: 'desc' },
    })
  }

  async findOne(id: string) {
    const g = await prisma.gestion.findUnique({
      where:   { id },
      include: { trimestres: { orderBy: { numero: 'asc' } } },
    })
    if (!g) throw new AppError(404, 'Gestión no encontrada', 'NOT_FOUND')
    return g
  }

  create(institucion_id: string, data: { anno: number }) {
    const y = data.anno
    return prisma.gestion.create({
      data: {
        ...data,
        institucion_id,
        activa: false,
        trimestres: {
          create: [
            { numero: 1, fecha_inicio: new Date(`${y}-02-03`), fecha_fin: new Date(`${y}-05-30`), cerrado: false },
            { numero: 2, fecha_inicio: new Date(`${y}-06-09`), fecha_fin: new Date(`${y}-09-12`), cerrado: false },
            { numero: 3, fecha_inicio: new Date(`${y}-09-22`), fecha_fin: new Date(`${y}-11-28`), cerrado: false },
          ],
        },
      },
      include: { trimestres: { orderBy: { numero: 'asc' } } },
    })
  }

  async findActiva(institucion_id: string) {
    const g = await prisma.gestion.findFirst({
      where:   { institucion_id, activa: true },
      include: { trimestres: { orderBy: { numero: 'asc' } } },
    })
    if (!g) throw new AppError(404, 'No hay gestión activa para esta institución', 'NOT_FOUND')
    return g
  }

  async activar(institucion_id: string, id: string) {
    await this.findOne(id)
    await prisma.gestion.updateMany({ where: { institucion_id, activa: true }, data: { activa: false } })
    return prisma.gestion.update({ where: { id }, data: { activa: true } })
  }

  // ── Cierre de gestión ───────────────────────────────────────────────────────

  async cerrar(id: string, institucion_id: string) {
    const gestion = await prisma.gestion.findUnique({
      where:   { id },
      include: { trimestres: { orderBy: { numero: 'asc' } } },
    })
    if (!gestion || gestion.institucion_id !== institucion_id) {
      throw new AppError(404, 'Gestión no encontrada', 'NOT_FOUND')
    }
    const abiertos = gestion.trimestres.filter(t => !t.cerrado)
    if (abiertos.length > 0) {
      throw new AppError(400, `Hay ${abiertos.length} trimestre(s) aún abierto(s). Cierre todos los trimestres antes de cerrar la gestión.`, 'TRIMESTRES_ABIERTOS')
    }

    // Obtener matriculas con asignaciones e indicadores
    const matriculas = await prisma.matricula.findMany({
      where: { gestion_id: id },
      include: {
        paralelo: {
          include: {
            asignaciones: {
              where: { gestion_id: id },
              include: {
                indicadores: {
                  include: {
                    notas:     true,
                    dimension: { select: { puntaje_max: true } },
                  },
                },
              },
            },
          },
        },
      },
    })

    const resultadosData: Array<{
      estudiante_id: string
      materia_id:    string
      gestion_id:    string
      promedio:      number
      aprobado:      boolean
    }> = []

    for (const matricula of matriculas) {
      for (const asignacion of matricula.paralelo.asignaciones) {
        const puntajesPorTrimestre: number[] = []

        for (const trimestre of gestion.trimestres) {
          const indicadoresTrim = asignacion.indicadores.filter(i => i.trimestre_id === trimestre.id)
          if (indicadoresTrim.length === 0) continue

          const dimMap = new Map<string, { max: number; ganado: number }>()
          for (const indicador of indicadoresTrim) {
            if (!dimMap.has(indicador.dimension_id)) {
              dimMap.set(indicador.dimension_id, { max: indicador.dimension.puntaje_max, ganado: 0 })
            }
            const nota = indicador.notas.find(n => n.estudiante_id === matricula.estudiante_id)
            if (nota?.puntaje) {
              dimMap.get(indicador.dimension_id)!.ganado += nota.puntaje
            }
          }

          let totalGanado = 0
          let totalMax    = 0
          for (const [, dim] of dimMap) {
            totalGanado += Math.min(dim.ganado, dim.max)
            totalMax    += dim.max
          }
          if (totalMax > 0) puntajesPorTrimestre.push((totalGanado / totalMax) * 100)
        }

        if (puntajesPorTrimestre.length === 0) continue

        const promedio = puntajesPorTrimestre.reduce((a, b) => a + b, 0) / puntajesPorTrimestre.length
        resultadosData.push({
          estudiante_id: matricula.estudiante_id,
          materia_id:    asignacion.materia_id,
          gestion_id:    id,
          promedio:      parseFloat(promedio.toFixed(2)),
          aprobado:      promedio >= 51,
        })
      }
    }

    // Guardar resultados
    await prisma.resultadoFinal.createMany({ data: resultadosData, skipDuplicates: true })

    // Calcular y guardar promociones
    const aprobMap = new Map<string, boolean[]>()
    for (const r of resultadosData) {
      if (!aprobMap.has(r.estudiante_id)) aprobMap.set(r.estudiante_id, [])
      aprobMap.get(r.estudiante_id)!.push(r.aprobado)
    }

    const promocionesData = Array.from(aprobMap.entries()).map(([estudiante_id, aprobaciones]) => ({
      estudiante_id,
      gestion_id: id,
      promovido:  aprobaciones.every(a => a),
    }))

    await prisma.promocion.createMany({ data: promocionesData, skipDuplicates: true })

    // Notificar a todos los usuarios de la institución
    const usuarios = await prisma.usuario.findMany({
      where:  { institucion_id, activo: true },
      select: { id: true },
    })
    await prisma.notificacion.createMany({
      data: usuarios.map(u => ({
        usuario_id: u.id,
        tipo:       'TRIMESTRE_CERRADO' as const,
        titulo:     `Gestión ${gestion.anno} cerrada`,
        cuerpo:     'La gestión académica ha sido cerrada oficialmente.',
        referencia_id:   id,
        referencia_tipo: 'GESTION',
      })),
    })

    return {
      resultados_calculados: resultadosData.length,
      promociones_calculadas: promocionesData.length,
    }
  }

  async getResultados(id: string, opts: { paralelo_id?: string } = {}) {
    return prisma.resultadoFinal.findMany({
      where: {
        gestion_id: id,
        ...(opts.paralelo_id ? {
          estudiante: { matriculas: { some: { paralelo_id: opts.paralelo_id } } },
        } : {}),
      },
      include: {
        estudiante: { include: { usuario: { select: { nombre: true, apellido: true } } } },
        materia:    { select: { nombre: true } },
      },
      orderBy: [{ estudiante: { usuario: { apellido: 'asc' } } }, { materia: { nombre: 'asc' } }],
    })
  }
}
