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
        // Un área con subáreas ya no se asigna directamente — solo sus subáreas
        tiene_subareas: false,
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

    const grados = await prisma.grado.findMany({ where: { nivel_id }, orderBy: { orden: 'asc' } })
    // Se traen todas (incluidas inactivas) para no perder una subárea activa cuya área padre
    // haya quedado inactiva — el filtro de qué mostrar se aplica después de agrupar.
    const todas = await prisma.materia.findMany({
      where:   { nivel_id },
      include: { campo: true, carga_horaria: { include: { grado: true } } },
      orderBy: [{ campo: { nombre: 'asc' } }, { nombre: 'asc' }],
    })

    const subareasPorPadre = new Map<string, typeof todas>()
    for (const m of todas) {
      if (!m.es_subarea_de_id) continue
      if (!subareasPorPadre.has(m.es_subarea_de_id)) subareasPorPadre.set(m.es_subarea_de_id, [])
      subareasPorPadre.get(m.es_subarea_de_id)!.push(m)
    }

    const materias = todas
      .filter(m => !m.es_subarea_de_id)
      .map(padre => ({
        ...padre,
        subareas: (subareasPorPadre.get(padre.id) ?? []).filter(s => s.activa),
      }))
      .filter(padre => padre.activa || padre.subareas.length > 0)

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

    // Mantiene Materia.horas_semanales (horas mensuales resumen) sincronizado con lo editado acá: si
    // todos los grados de una materia terminan con el mismo valor, ese es su resumen; si varían, queda
    // en null (no hay un solo número que lo represente). Las materias con subáreas no tienen horas
    // propias — se omiten.
    const materiaIds = [...new Set(entries.map(e => e.materia_id))]
    for (const materiaId of materiaIds) {
      const materia = await prisma.materia.findUnique({ where: { id: materiaId }, select: { tiene_subareas: true } })
      if (!materia || materia.tiene_subareas) continue

      const filas   = await prisma.cargaHorariaMateria.findMany({ where: { materia_id: materiaId } })
      const valores = new Set(filas.map(f => f.horas_mes))
      const uniforme = valores.size === 1 ? filas[0]!.horas_mes : null
      await prisma.materia.update({ where: { id: materiaId }, data: { horas_semanales: uniforme } })
    }
  }

  /** Aplica `horasMensuales` a todos los grados aplicables de una materia (crea/actualiza CargaHorariaMateria). */
  private async syncCargaHorariaUniforme(
    materia: { id: string; nivel_id: string; aplica_solo_desde_grado: number | null; aplica_hasta_grado: number | null },
    horasMensuales: number,
  ) {
    const grados = await prisma.grado.findMany({ where: { nivel_id: materia.nivel_id } })
    const aplicables = grados.filter(g =>
      (materia.aplica_solo_desde_grado === null || g.orden >= materia.aplica_solo_desde_grado) &&
      (materia.aplica_hasta_grado === null || g.orden <= materia.aplica_hasta_grado)
    )
    for (const g of aplicables) {
      await prisma.cargaHorariaMateria.upsert({
        where:  { materia_id_grado_id: { materia_id: materia.id, grado_id: g.id } },
        create: { materia_id: materia.id, grado_id: g.id, horas_mes: horasMensuales },
        update: { horas_mes: horasMensuales },
      })
    }
  }

  /** Materias de nivel superior (posibles áreas padre) agrupadas con sus subáreas, para la gestión CRUD. */
  async findAdmin(institucion_id: string, nivel_id?: string) {
    return prisma.materia.findMany({
      where: {
        es_subarea_de_id: null,
        nivel: { institucion_id, ...(nivel_id ? { id: nivel_id } : {}) },
      },
      include: {
        campo: true,
        _count: { select: { asignaciones: true } },
        subareas: {
          include: { _count: { select: { asignaciones: true } } },
          orderBy: { nombre: 'asc' },
        },
      },
      orderBy: [{ campo: { nombre: 'asc' } }, { nombre: 'asc' }],
    })
  }

  /** Campos (áreas de conocimiento) disponibles para crear una nueva área, filtrados por nivel. */
  findCampos(institucion_id: string, nivel_id?: string) {
    return prisma.campo.findMany({
      where:   { institucion_id, ...(nivel_id ? { nivel_id } : {}) },
      orderBy: { nombre: 'asc' },
    })
  }

  /**
   * Crea una Materia nueva: si viene `es_subarea_de_id`, crea una subárea bajo esa materia padre
   * (heredando campo/nivel/solo_si_bth y con el nombre "Base (Área Padre)"); si no, crea un área de
   * nivel superior nueva bajo el `campo_id` indicado.
   */
  async create(institucion_id: string, data: {
    nombre: string
    es_subarea_de_id?: string | null | undefined
    campo_id?: string | undefined
    solo_si_bth?: boolean | undefined
    aplica_solo_desde_grado?: number | null | undefined
    aplica_hasta_grado?: number | null | undefined
    horas_semanales?: number | null | undefined
  }) {
    const base = data.nombre.trim()
    if (!base) throw new AppError(400, 'El nombre es requerido', 'VALIDATION')

    if (data.es_subarea_de_id) {
      const padre = await prisma.materia.findFirst({
        where: { id: data.es_subarea_de_id, nivel: { institucion_id } },
      })
      if (!padre) throw new AppError(404, 'Área padre no encontrada', 'NOT_FOUND')
      if (padre.es_subarea_de_id) {
        throw new AppError(400, 'No se pueden crear subáreas dentro de otra subárea', 'VALIDATION')
      }

      const [materia] = await prisma.$transaction([
        prisma.materia.create({
          data: {
            nombre:                  `${base} (${padre.nombre})`,
            campo_id:                padre.campo_id,
            nivel_id:                padre.nivel_id,
            solo_si_bth:             padre.solo_si_bth,
            es_subarea_de_id:        padre.id,
            aplica_solo_desde_grado: data.aplica_solo_desde_grado ?? padre.aplica_solo_desde_grado,
            aplica_hasta_grado:      data.aplica_hasta_grado ?? padre.aplica_hasta_grado,
            horas_semanales:         data.horas_semanales ?? null,
          },
          include: { campo: true, parent_materia: { select: { id: true, nombre: true } } },
        }),
        prisma.materia.update({ where: { id: padre.id }, data: { tiene_subareas: true } }),
      ])
      if (data.horas_semanales) await this.syncCargaHorariaUniforme(materia, data.horas_semanales)
      return materia
    }

    // Crear un ÁREA nueva (materia de nivel superior)
    if (!data.campo_id) throw new AppError(400, 'campo_id es requerido para crear un área', 'VALIDATION')
    const campo = await prisma.campo.findFirst({ where: { id: data.campo_id, institucion_id } })
    if (!campo) throw new AppError(404, 'Campo no encontrado', 'NOT_FOUND')

    const area = await prisma.materia.create({
      data: {
        nombre:                  base,
        campo_id:                campo.id,
        nivel_id:                campo.nivel_id,
        solo_si_bth:             data.solo_si_bth ?? false,
        aplica_solo_desde_grado: data.aplica_solo_desde_grado ?? null,
        aplica_hasta_grado:      data.aplica_hasta_grado ?? null,
        horas_semanales:         data.horas_semanales ?? null,
      },
      include: { campo: true },
    })
    if (data.horas_semanales) await this.syncCargaHorariaUniforme(area, data.horas_semanales)
    return area
  }

  /** Edita un área o una subárea existente (no permite cambiar de campo/área padre). */
  async update(institucion_id: string, id: string, data: {
    nombre?: string | undefined
    activa?: boolean | undefined
    solo_si_bth?: boolean | undefined
    aplica_solo_desde_grado?: number | null | undefined
    aplica_hasta_grado?: number | null | undefined
    horas_semanales?: number | null | undefined
  }) {
    const materia = await prisma.materia.findFirst({
      where:   { id, nivel: { institucion_id } },
      include: { parent_materia: { select: { nombre: true } } },
    })
    if (!materia) throw new AppError(404, 'Materia no encontrada', 'NOT_FOUND')

    let nombre: string | undefined
    if (data.nombre !== undefined) {
      const base = data.nombre.trim()
      if (!base) throw new AppError(400, 'El nombre es requerido', 'VALIDATION')
      nombre = materia.parent_materia ? `${base} (${materia.parent_materia.nombre})` : base
    }

    const actualizada = await prisma.materia.update({
      where: { id },
      data: {
        ...(nombre !== undefined ? { nombre } : {}),
        ...(data.activa !== undefined ? { activa: data.activa } : {}),
        ...(data.solo_si_bth !== undefined ? { solo_si_bth: data.solo_si_bth } : {}),
        ...(data.aplica_solo_desde_grado !== undefined ? { aplica_solo_desde_grado: data.aplica_solo_desde_grado } : {}),
        ...(data.aplica_hasta_grado !== undefined ? { aplica_hasta_grado: data.aplica_hasta_grado } : {}),
        ...(data.horas_semanales !== undefined ? { horas_semanales: data.horas_semanales } : {}),
      },
    })

    // Un área con subáreas no tiene horas propias — se derivan de sus subáreas, nunca se sincronizan acá.
    if (data.horas_semanales != null && !materia.tiene_subareas) {
      await this.syncCargaHorariaUniforme(actualizada, data.horas_semanales)
    }

    return actualizada
  }

  /**
   * Elimina un área o una subárea. Si tiene asignaciones vigentes en la gestión activa, primero las
   * quita (cascada: notas → indicadores → asistencias/tareas → asignación), liberando a los docentes
   * para reasignarlos — el historial de gestiones anteriores no se toca. Luego: hard delete si no queda
   * ningún rastro (ni asignaciones de otras gestiones ni resultados finales), soft delete (activa=false)
   * en caso contrario. Un área con subáreas activas no se puede eliminar — hay que quitar sus subáreas
   * primero.
   */
  async remove(institucion_id: string, id: string) {
    const materia = await prisma.materia.findFirst({ where: { id, nivel: { institucion_id } } })
    if (!materia) throw new AppError(404, 'Materia no encontrada', 'NOT_FOUND')

    if (!materia.es_subarea_de_id) {
      const subareasActivas = await prisma.materia.count({ where: { es_subarea_de_id: id, activa: true } })
      if (subareasActivas > 0) {
        throw new AppError(400, 'Esta área tiene subáreas activas — elimínalas primero', 'VALIDATION')
      }
    }

    const gestionActiva = await prisma.gestion.findFirst({ where: { institucion_id, activa: true } })
    const asignacionesActuales = gestionActiva
      ? await prisma.asignacion.findMany({
          where:  { materia_id: id, gestion_id: gestionActiva.id },
          select: { id: true },
        })
      : []

    if (asignacionesActuales.length > 0) {
      await prisma.$transaction(async (tx) => {
        for (const asig of asignacionesActuales) {
          const indicadores = await tx.indicador.findMany({ where: { asignacion_id: asig.id }, select: { id: true } })
          if (indicadores.length > 0) {
            await tx.notaIndicador.deleteMany({ where: { indicador_id: { in: indicadores.map(i => i.id) } } })
            await tx.indicador.deleteMany({ where: { asignacion_id: asig.id } })
          }
          await tx.asistenciaClase.deleteMany({ where: { asignacion_id: asig.id } })
          await tx.tarea.deleteMany({ where: { asignacion_id: asig.id } })
          await tx.asignacion.delete({ where: { id: asig.id } })
        }
      })
    }

    const [asignacionesRestantes, resultadosFinales] = await Promise.all([
      prisma.asignacion.count({ where: { materia_id: id } }),
      prisma.resultadoFinal.count({ where: { materia_id: id } }),
    ])
    const hardDelete = asignacionesRestantes === 0 && resultadosFinales === 0

    if (hardDelete) {
      await prisma.materia.delete({ where: { id } })
    } else {
      await prisma.materia.update({ where: { id }, data: { activa: false } })
    }

    if (materia.es_subarea_de_id) {
      const hermanasActivas = await prisma.materia.count({
        where: { es_subarea_de_id: materia.es_subarea_de_id, activa: true },
      })
      if (hermanasActivas === 0) {
        await prisma.materia.update({ where: { id: materia.es_subarea_de_id }, data: { tiene_subareas: false } })
      }
    }

    return { hard_delete: hardDelete, asignaciones_eliminadas: asignacionesActuales.length }
  }
}
