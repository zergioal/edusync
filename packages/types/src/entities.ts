import type { Rol, Nivel, Instrumento, EstadoAsistencia, VisiblePara, TipoGaleria } from './enums'

export interface Institucion {
  id: string
  nombre: string
  subdominio: string
  logo_url: string | null
  activa: boolean
  created_at: Date
}

export interface Usuario {
  id: string
  institucion_id: string
  supabase_auth_id: string
  email: string
  rol: Rol
  nombre: string
  apellido: string
  activo: boolean
  created_at: Date
}

export interface Docente {
  id: string
  usuario_id: string
  usuario?: Usuario
}

export interface Estudiante {
  id: string
  usuario_id: string
  codigo: string
  nivel_id: string
  usuario?: Usuario
  nivel?: NivelEntity
}

export interface RelacionPadreHijo {
  padre_id: string
  estudiante_id: string
}

export interface NivelEntity {
  id: string
  institucion_id: string
  nombre: Nivel
}

export interface Grado {
  id: string
  nivel_id: string
  nombre: string
  orden: number
}

export interface Paralelo {
  id: string
  grado_id: string
  letra: string
  asesor_id: string | null
  activo: boolean
}

export interface Matricula {
  id: string
  estudiante_id: string
  paralelo_id: string
  gestion_id: string
}

export interface Campo {
  id: string
  institucion_id: string
  nivel_id: string
  nombre: string
}

export interface Materia {
  id: string
  campo_id: string
  nivel_id: string
  nombre: string
  activa: boolean
}

export interface Gestion {
  id: string
  institucion_id: string
  anno: number
  activa: boolean
}

export interface Trimestre {
  id: string
  gestion_id: string
  numero: number
  fecha_inicio: Date
  fecha_fin: Date
  cerrado: boolean
}

export interface Asignacion {
  id: string
  docente_id: string
  materia_id: string
  paralelo_id: string
  trimestre_id: string
}

export interface Dimension {
  id: string
  institucion_id: string
  nombre: string
  puntaje_max: number
  orden: number
}

export interface Indicador {
  id: string
  asignacion_id: string
  dimension_id: string
  nombre: string
  instrumento: Instrumento
  fecha_aplicacion: Date
  es_parcial: boolean
  orden: number
}

export interface NotaIndicador {
  id: string
  indicador_id: string
  estudiante_id: string
  puntaje: number | null
}

export interface ObservacionInicial {
  id: string
  docente_id: string
  estudiante_id: string
  trimestre_id: string
  contenido: string
}

export interface Pension {
  id: string
  estudiante_id: string
  gestion_id: string
  mes: number
  monto: number
  pagado: boolean
  fecha_pago: Date | null
}

export interface Pago {
  id: string
  pension_id: string
  registrado_por: string
  fecha: Date
  comprobante: string
}

export interface AsistenciaClase {
  id: string
  asignacion_id: string
  estudiante_id: string
  fecha: Date
  estado: EstadoAsistencia
}

export interface AsistenciaDiaria {
  id: string
  regente_id: string
  paralelo_id: string
  estudiante_id: string
  fecha: Date
  estado: EstadoAsistencia
}

export interface Horario {
  id: string
  paralelo_id: string
  materia_id: string
  docente_id: string
  dia_semana: number
  hora_inicio: string
  hora_fin: string
}

export interface Anuncio {
  id: string
  institucion_id: string
  autor_id: string
  titulo: string
  contenido: string
  visible_para: VisiblePara
  publicado_en: Date
  activo: boolean
}

export interface GaleriaItem {
  id: string
  institucion_id: string
  tipo: TipoGaleria
  url: string
  descripcion: string | null
  publicado_en: Date
}
