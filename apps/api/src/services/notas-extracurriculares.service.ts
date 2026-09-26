import { prisma } from '@edusync/database'
import { AppError } from '../middlewares/errorHandler'

export class NotaExtracurricularService {
  /** Confirma que la asignación pertenece a la institución del usuario que hace la petición. */
  private async verificarAcceso(asignacion_id: string, institucion_id: string) {
    const asignacion = await prisma.asignacion.findUnique({
      where:   { id: asignacion_id },
      include: { docente: { include: { usuario: { select: { institucion_id: true } } } } },
    })
    if (!asignacion) throw new AppError(404, 'Asignación no encontrada', 'NOT_FOUND')
    if (asignacion.docente.usuario.institucion_id !== institucion_id) {
      throw new AppError(403, 'Sin acceso', 'FORBIDDEN')
    }
    return asignacion
  }

  /**
   * Mapa reutilizable de notas extracurriculares `"${asignacion_id}:${estudiante_id}"` → valor,
   * para un lote de asignaciones en un trimestre. Usado desde boletines/planilla/reportes al
   * calcular totales.
   */
  async getMapa(asignacion_ids: string[], trimestre_id: string): Promise<Map<string, number>> {
    if (asignacion_ids.length === 0) return new Map()
    const filas = await prisma.notaExtracurricular.findMany({
      where:  { asignacion_id: { in: asignacion_ids }, trimestre_id },
      select: { asignacion_id: true, estudiante_id: true, valor: true },
    })
    return new Map(filas.map(f => [`${f.asignacion_id}:${f.estudiante_id}`, f.valor]))
  }

  /**
   * Igual que getMapa pero indexado también por trimestre — para reportes que recorren varios
   * trimestres a la vez (ej. promoción anual). Clave: "asignacion_id:estudiante_id:trimestre_id".
   */
  async getMapaMultiTrimestre(asignacion_ids: string[], trimestre_ids: string[]): Promise<Map<string, number>> {
    if (asignacion_ids.length === 0 || trimestre_ids.length === 0) return new Map()
    const filas = await prisma.notaExtracurricular.findMany({
      where:  { asignacion_id: { in: asignacion_ids }, trimestre_id: { in: trimestre_ids } },
      select: { asignacion_id: true, estudiante_id: true, trimestre_id: true, valor: true },
    })
    return new Map(filas.map(f => [`${f.asignacion_id}:${f.estudiante_id}:${f.trimestre_id}`, f.valor]))
  }

  /** Lista los matriculados del paralelo de esta asignación con su nota extracurricular actual (o null). */
  async list(asignacion_id: string, trimestre_id: string, institucion_id: string) {
    const asignacion = await this.verificarAcceso(asignacion_id, institucion_id)

    const [matriculas, notas] = await Promise.all([
      prisma.matricula.findMany({
        where:   { paralelo_id: asignacion.paralelo_id, gestion_id: asignacion.gestion_id, estudiante: { estado: 'ACTIVO' } },
        include: { estudiante: { include: { usuario: { select: { nombre: true, apellido: true } } } } },
        orderBy: [
          { estudiante: { usuario: { apellido: 'asc' } } },
          { estudiante: { usuario: { nombre:   'asc' } } },
        ],
      }),
      prisma.notaExtracurricular.findMany({ where: { asignacion_id, trimestre_id } }),
    ])

    const notaPorEstudiante = new Map(notas.map(n => [n.estudiante_id, n]))

    return matriculas.map(m => {
      const nota = notaPorEstudiante.get(m.estudiante_id)
      return {
        estudiante_id: m.estudiante_id,
        nombre:        m.estudiante.usuario.nombre,
        apellido:      m.estudiante.usuario.apellido,
        codigo:        m.estudiante.codigo,
        valor:         nota?.valor ?? null,
        motivo:        nota?.motivo ?? null,
      }
    })
  }

  /** `valor: null` borra la nota extracurricular de ese estudiante; el resto hace upsert. */
  async upsertBulk(
    asignacion_id: string,
    trimestre_id:  string,
    entries: { estudiante_id: string; valor: number | null; motivo?: string | null }[],
    usuario_id: string,
    institucion_id: string,
  ) {
    await this.verificarAcceso(asignacion_id, institucion_id)

    for (const e of entries) {
      if (e.valor === null) {
        await prisma.notaExtracurricular.deleteMany({
          where: { asignacion_id, trimestre_id, estudiante_id: e.estudiante_id },
        })
        continue
      }
      await prisma.notaExtracurricular.upsert({
        where: {
          asignacion_id_estudiante_id_trimestre_id: {
            asignacion_id, estudiante_id: e.estudiante_id, trimestre_id,
          },
        },
        create: {
          asignacion_id, trimestre_id, estudiante_id: e.estudiante_id,
          valor: e.valor, motivo: e.motivo ?? null, creado_por_id: usuario_id,
        },
        update: { valor: e.valor, motivo: e.motivo ?? null, creado_por_id: usuario_id },
      })
    }

    return this.list(asignacion_id, trimestre_id, institucion_id)
  }
}
