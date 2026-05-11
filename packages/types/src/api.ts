export interface ApiResponse<T> {
  data: T
  message?: string
}

export interface ApiError {
  error: string
  message: string
  statusCode: number
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

/** Payload del JWT de Supabase (campos estándar) */
export interface SupabaseJwtPayload {
  sub:   string
  email: string
  iat:   number
  exp:   number
  app_metadata?: Record<string, unknown>
  user_metadata?: Record<string, unknown>
}

/** Contexto de autenticación que expone req.auth en la API */
export interface AuthPayload {
  supabase_uid:   string
  email:          string
  institucion_id: string
  rol:            string
  usuario_id:     string
}
