import { prisma } from '@edusync/database'
import { AppError } from '../middlewares/errorHandler'

interface RecreoPeriodoInput {
  despues_de_periodo: number
  duracion_min:       number
}

interface HorarioNivelInput {
  nivel_id:         string
  hora_inicio:      string
  minutos_lectura:  number
  max_periodos_dia: number
  recreos:          RecreoPeriodoInput[]
}

interface TurnoInput {
  id:             string
  activo:         boolean
  horarios_nivel: HorarioNivelInput[]
}

interface ConfigInput {
  tipo_ue?:             string
  duracion_periodo_min?: number
  turnos?:              TurnoInput[]
}

export class ConfiguracionService {
  async getConfig(institucion_id: string) {
    const [inst, configHorario, turnos, niveles] = await Promise.all([
      prisma.institucion.findUnique({ where: { id: institucion_id } }),
      prisma.configHorario.findUnique({ where: { institucion_id } }),
      prisma.turno.findMany({
        where:   { institucion_id },
        include: {
          horarios_nivel: {
            include: {
              nivel:   true,
              recreos: { orderBy: { despues_de_periodo: 'asc' } },
            },
          },
        },
        orderBy: { nombre: 'asc' },
      }),
      prisma.nivel.findMany({
        where:   { institucion_id },
        orderBy: { nombre: 'asc' },
      }),
    ])

    if (!inst) throw new AppError(404, 'Institución no encontrada', 'NOT_FOUND')

    return {
      tipo_ue:              inst.tipo_ue,
      duracion_periodo_min: configHorario?.duracion_periodo_min ?? 40,
      turnos,
      niveles,
    }
  }

  async updateConfig(institucion_id: string, data: ConfigInput) {
    const { tipo_ue, duracion_periodo_min, turnos } = data

    await prisma.$transaction(async (tx) => {
      if (tipo_ue !== undefined) {
        await tx.institucion.update({ where: { id: institucion_id }, data: { tipo_ue } })
      }

      if (duracion_periodo_min !== undefined) {
        await tx.configHorario.upsert({
          where:  { institucion_id },
          create: { institucion_id, duracion_periodo_min },
          update: { duracion_periodo_min },
        })
      }

      if (turnos) {
        for (const turno of turnos) {
          await tx.turno.update({
            where: { id: turno.id },
            data:  { activo: turno.activo },
          })

          for (const hn of turno.horarios_nivel) {
            const existing = await tx.horarioNivelTurno.findUnique({
              where: { turno_id_nivel_id: { turno_id: turno.id, nivel_id: hn.nivel_id } },
            })

            if (existing) {
              await tx.horarioNivelTurno.update({
                where: { id: existing.id },
                data: {
                  hora_inicio:      hn.hora_inicio,
                  minutos_lectura:  hn.minutos_lectura,
                  max_periodos_dia: hn.max_periodos_dia,
                },
              })
              await tx.recreoPeriodo.deleteMany({ where: { horario_nivel_turno_id: existing.id } })
              if (hn.recreos.length > 0) {
                await tx.recreoPeriodo.createMany({
                  data: hn.recreos.map(r => ({
                    horario_nivel_turno_id: existing.id,
                    despues_de_periodo:     r.despues_de_periodo,
                    duracion_min:           r.duracion_min,
                  })),
                })
              }
            } else {
              const created = await tx.horarioNivelTurno.create({
                data: {
                  turno_id:         turno.id,
                  nivel_id:         hn.nivel_id,
                  hora_inicio:      hn.hora_inicio,
                  minutos_lectura:  hn.minutos_lectura,
                  max_periodos_dia: hn.max_periodos_dia,
                },
              })
              if (hn.recreos.length > 0) {
                await tx.recreoPeriodo.createMany({
                  data: hn.recreos.map(r => ({
                    horario_nivel_turno_id: created.id,
                    despues_de_periodo:     r.despues_de_periodo,
                    duracion_min:           r.duracion_min,
                  })),
                })
              }
            }
          }
        }
      }
    })

    return this.getConfig(institucion_id)
  }
}
