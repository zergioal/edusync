import { Router, type Router as ExpressRouter } from 'express'
import { authMiddleware } from '../middlewares/auth'

import { authRouter }          from './auth.routes'
import { setupRouter }         from './setup.routes'
import { publicRouter }        from './public.routes'
import { pensionesRouter }     from './pensiones.routes'
import { tarifasRouter }      from './tarifas.routes'
import { institucionesRouter } from './instituciones.routes'
import { usuariosRouter }      from './usuarios.routes'
import { estudiantesRouter }   from './estudiantes.routes'
import { gestionesRouter }     from './gestiones.routes'
import { nivelesRouter }       from './niveles.routes'
import { gradosRouter }        from './grados.routes'
import { docentesRouter }      from './docentes.routes'
import { materiasRouter }      from './materias.routes'
import { trimestresRouter }    from './trimestres.routes'
import { paralelosRouter }     from './paralelos.routes'
import { asignacionesRouter }  from './asignaciones.routes'
import { planillaRouter }      from './planilla.routes'
import { indicadoresRouter }   from './indicadores.routes'
import { notasRouter }         from './notas.routes'
import { matriculasRouter }    from './matriculas.routes'
import { boletinesRouter }    from './boletines.routes'
import { reportesRouter }       from './reportes.routes'
import { configuracionRouter }  from './configuracion.routes'
import { inicialRouter }        from './inicial.routes'
import { asistenciaRouter }     from './asistencia.routes'
import { anunciosRouter }       from './anuncios.routes'
import { tareasRouter }         from './tareas.routes'
import { mensajesRouter }       from './mensajes.routes'
import { notificacionesRouter } from './notificaciones.routes'
import { auditoriaRouter }      from './auditoria.routes'

export const apiRouter: ExpressRouter = Router()

// ── Públicas (sin auth) ───────────────────────────────────────────────────────
apiRouter.use('/auth',   authRouter)
apiRouter.use('/setup',  setupRouter)
apiRouter.use('/public', publicRouter)

// ── Protegidas — requieren JWT válido ────────────────────────────────────────
apiRouter.use(authMiddleware)

apiRouter.use('/instituciones', institucionesRouter)
apiRouter.use('/usuarios',      usuariosRouter)
apiRouter.use('/estudiantes',   estudiantesRouter)
apiRouter.use('/gestiones',     gestionesRouter)
apiRouter.use('/niveles',       nivelesRouter)
apiRouter.use('/grados',        gradosRouter)
apiRouter.use('/docentes',      docentesRouter)
apiRouter.use('/materias',      materiasRouter)
apiRouter.use('/trimestres',    trimestresRouter)
apiRouter.use('/paralelos',     paralelosRouter)
apiRouter.use('/asignaciones',  asignacionesRouter)
apiRouter.use('/planilla',      planillaRouter)
apiRouter.use('/indicadores',   indicadoresRouter)
apiRouter.use('/notas',         notasRouter)
apiRouter.use('/matriculas',    matriculasRouter)
apiRouter.use('/pensiones',     pensionesRouter)
apiRouter.use('/tarifas',       tarifasRouter)
apiRouter.use('/boletines',      boletinesRouter)
apiRouter.use('/reportes',       reportesRouter)
apiRouter.use('/configuracion',  configuracionRouter)
apiRouter.use('/inicial',        inicialRouter)
apiRouter.use('/asistencia',      asistenciaRouter)
apiRouter.use('/anuncios',        anunciosRouter)
apiRouter.use('/tareas',          tareasRouter)
apiRouter.use('/mensajes',        mensajesRouter)
apiRouter.use('/notificaciones',  notificacionesRouter)
apiRouter.use('/auditoria',       auditoriaRouter)
