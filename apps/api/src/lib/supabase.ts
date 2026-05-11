import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null

export function getSupabaseAdmin(): SupabaseClient {
  if (_client) return _client

  const url = process.env['SUPABASE_URL']
  const key = process.env['SUPABASE_SERVICE_ROLE_KEY']

  if (!url || !key) {
    throw new Error(
      '[API] Faltan variables de entorno: SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY. ' +
      'Verifica que apps/api/.env existe y tiene esas variables.'
    )
  }

  _client = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  return _client
}
