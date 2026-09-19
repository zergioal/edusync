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
      return materia
    }

    // Crear un ÁREA nueva (materia de nivel superior)
    if (!data.campo_id) throw new AppError(400, 'campo_id es requerido para crear un área', 'VALIDATION')
    const campo = await prisma.campo.findFirst({ where: { id: data.campo_id, institucion_id } })
    if (!campo) throw new AppError(404, 'Campo no encontrado', 'NOT_FOUND')

    return prisma.materia.create({
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

    return prisma.materia.update({
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
  }

  /**
   * Elimina un área o una subárea: hard delete si nunca se usó, soft delete (activa=false) si ya tiene
   * historial. Un área con subáreas activas no se puede eliminar — hay que quitar sus subáreas primero.
   */
  async remove(institucion_id: string, id: string) {
    const materia = await prisma.materia.findFirst({
      where:   { id, nivel: { institucion_id } },
      include: { _count: { select: { asignaciones: true } } },
    })
    if (!materia) throw new AppError(404, 'Materia no encontrada', 'NOT_FOUND')

    if (!materia.es_subarea_de_id) {
      const subareasActivas = await prisma.materia.count({ where: { es_subarea_de_id: id, activa: true } })
      if (subareasActivas > 0) {
        throw new AppError(400, 'Esta área tiene subáreas activas — elimínalas primero', 'VALIDATION')
      }
    }

    const hardDelete = materia._count.asignaciones === 0
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

    return { hard_delete: hardDelete }
  }
}
