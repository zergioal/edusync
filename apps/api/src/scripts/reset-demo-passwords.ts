/**
 * reset-demo-passwords.ts — Fija una contraseña por rol (fácil de recordar) a las
 * cuentas que se van a usar en la demo en vivo de la exposición, e imprime la
 * lista lista para repartir. Script de un solo uso.
 * Uso: npx tsx src/scripts/reset-demo-passwords.ts  (desde apps/api)
 */

import 'dotenv/config'
import { prisma } from '@edusync/database'
import { createClient } from '@supabase/supabase-js'

const PASSWORD_POR_ROL: Record<string, string> = {
  DIRECTOR:    'director2026',
  COORDINADOR: 'coordinador2026',
  SECRETARIA:  'secretaria2026',
  REGENTE:     'regente2026',
  CONTADOR:    'contador2026',
  DOCENTE:     'docente2026',
  ESTUDIANTE:  'estudiante2026',
  PADRE_TUTOR: 'padre2026',
}

async function main() {
  const supabase = createClient(process.env['SUPABASE_URL']!, process.env['SUPABASE_SERVICE_ROLE_KEY']!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const todosLosDocentes = await prisma.usuario.findMany({
    where: { rol: 'DOCENTE' }, select: { email: true }, orderBy: { apellido: 'asc' },
  })

  const emails = [
    'director@pioxii.edu.bo',
    'coordinador@pioxii.edu.bo',
    'secretaria@pioxii.edu.bo',
    'regente@pioxii.edu.bo',
    'contador@pioxii.edu.bo',
    ...todosLosDocentes.map(d => d.email),
    'verduguez.copa.naira.2025@uepioxii.edu.bo',  // estudiante — al día
    'jhesith.chambilla6@uepioxii.edu.bo',         // estudiante — bloqueada
    'aguilar.huanca.jesus.2025@uepioxii.edu.bo',  // estudiante — bloqueado
    'padre.verduguez.copa.34@gmail.com',
    'padre.chambilla.sarcillo.08@gmail.com',
    'padre.aguilar.huanca.01@gmail.com',
  ]

  const filas: Array<{ rol: string; nombre: string; email: string; password: string; ok: boolean }> = []

  for (const email of emails) {
    const u = await prisma.usuario.findUnique({ where: { email }, select: { id: true, rol: true, nombre: true, apellido: true, supabase_auth_id: true } })
    if (!u) { filas.push({ rol: '?', nombre: '(no encontrado)', email, password: '-', ok: false }); continue }
    const password = PASSWORD_POR_ROL[u.rol] ?? 'demo2026'
    const { error } = await supabase.auth.admin.updateUserById(u.supabase_auth_id, { password })
    filas.push({ rol: u.rol, nombre: `${u.apellido}, ${u.nombre}`, email, password, ok: !error })
    if (error) console.error(`  ! Error en ${email}:`, error.message)
  }

  console.log('\n=== Credenciales de la demo — contraseña por rol ===\n')
  console.log('Rol'.padEnd(14), 'Nombre'.padEnd(32), 'Correo'.padEnd(45), 'Contraseña')
  console.log('-'.repeat(110))
  for (const f of filas) {
    console.log(f.rol.padEnd(14), f.nombre.padEnd(32), f.email.padEnd(45), f.password, f.ok ? '' : '  <-- FALLÓ')
  }

  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
