import { getSupabaseAdmin } from './supabase'
import { AppError } from '../middlewares/errorHandler'

/** Actualiza el email de login en Supabase Auth. Debe llamarse antes de escribir el nuevo email en Prisma. */
export async function updateAuthEmail(supabaseAuthId: string, newEmail: string): Promise<void> {
  const { error } = await getSupabaseAdmin().auth.admin.updateUserById(supabaseAuthId, { email: newEmail })
  if (error) throw new AppError(422, `No se pudo actualizar el correo de acceso: ${error.message}`, 'AUTH_ERROR')
}
