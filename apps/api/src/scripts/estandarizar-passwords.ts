/**
 * estandarizar-passwords.ts — Fija la contraseña estándar por rol (estudiante2026 /
 * padre2026) a TODAS las cuentas de estudiante y padre/tutor del sistema, nuevas y
 * preexistentes. Corrige la inconsistencia dejada por scripts de seed anteriores
 * (seed-5to-a.ts, etc.) que usaban otras contraseñas y solo un subconjunto fue
 * actualizado manualmente por reset-demo-passwords.ts.
 *
 * Uso: npx tsx src/scripts/estandarizar-passwords.ts  (desde apps/api)
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { PrismaClient } from '@prisma/client'

const PASSWORD_POR_ROL: Record<string, string> = {
  ESTUDIANTE:  'estudiante2026',
  PADRE_TUTOR: 'padre2026',
}

async function main() {
  const prisma = new PrismaClient({ datasources: { db: { url: process.env['DIRECT_URL'] } } })
  const supabase = createClient(process.env['SUPABASE_URL']!, process.env['SUPABASE_SERVICE_ROLE_KEY']!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const usuarios = await prisma.usuario.findMany({
    where: { rol: { in: ['ESTUDIANTE', 'PADRE_TUTOR'] } },
    select: { id: true, rol: true, email: true, supabase_auth_id: true },
    orderBy: { email: 'asc' },
  })

  console.log(`Cuentas a estandarizar: ${usuarios.length}\n`)

  let ok = 0
  let fail = 0
  for (const u of usuarios) {
    const password = PASSWORD_POR_ROL[u.rol]!
    const { error } = await supabase.auth.admin.updateUserById(u.supabase_auth_id, { password })
    if (error) {
      fail++
      console.error(`  ! FALLÓ ${u.email} (${u.rol}): ${error.message}`)
    } else {
      ok++
    }
  }

  console.log('\n──────────────────────────────────────')
  console.log(`  OK:     ${ok}`)
  console.log(`  Falló:  ${fail}`)
  console.log('──────────────────────────────────────')

  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
