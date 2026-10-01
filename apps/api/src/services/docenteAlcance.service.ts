import { prisma } from '@edusync/database'
import { AppError } from '../middlewares/errorHandler'

/**
 * Resuelve y valida qué cursos/estudiantes "le pertenecen" a un docente, para
 * los reportes de docente (Nómina, Calificaciones por curso, Control diario,
 * Padres/Tutores) — ninguno de esos reportes, al reusar el service de
 * Secretaría/Coordinador, filtra por dueño del paralelo o la asignación, así
 * que esa validación se hace acá antes de delegarles la consulta.
 */
export class DocenteAlcanceService {
  async getDocente(usuario_id: string) {
    const docente = await prisma.docente.findUnique({ where: { usuario_id } })
    if (!docente) throw new AppError(404, 'Perfil de docente no encontrado', 'NOT_FOUND')
    return docente
  }

  /** Paralelos donde el docente dicta (asignación activa) o es asesor. */
  async misParaleloIds(docente_id: string): Promise<string[]> {
    const [asignaciones, asesorias] = await Promise.all([
      prisma.asignacion.findMany({ where: { docente_id, gestion: { activa: true } }, select: { paralelo_id: true } }),
      prisma.paralelo.findMany({ where: { asesor_id: docente_id }, select: { id: true } }),
    ])
    return [...new Set([...asignaciones.map(a => a.paralelo_id), ...asesorias.map(p => p.id)])]
  }

  async verificarAccesoParalelo(docente_id: string, paralelo_id: string): Promise<void> {
    const ids = await this.misParaleloIds(docente_id)
    if (!ids.includes(paralelo_id)) throw new AppError(403, 'No tienes acceso a este curso', 'FORBIDDEN')
  }

  /** El estudiante debe estar matriculado (en cualquier gestión) en un paralelo del docente. */
  async verificarAccesoEstudiante(docente_id: string, estudiante_id: string): Promise<void> {
    const paraleloIds = await this.misParaleloIds(docente_id)
    if (paraleloIds.length === 0) throw new AppError(403, 'No tienes acceso a este estudiante', 'FORBIDDEN')
    const matricula = await prisma.matricula.findFirst({
      where: { estudiante_id, paralelo_id: { in: paraleloIds } },
      select: { id: true },
    })
    if (!matricula) throw new AppError(403, 'No tienes acceso a este estudiante', 'FORBIDDEN')
  }

  /** Asignaciones (materia+curso) activas del docente — para "Calificaciones por curso". */
  async misAsignaciones(docente_id: string) {
    return prisma.asignacion.findMany({
      where:  { docente_id, gestion: { activa: true } },
      select: { id: true, paralelo_id: true },
    })
  }
}
