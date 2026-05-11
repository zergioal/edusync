/**
 * seed-test-users.mjs
 *
 * 1. Cambia contraseñas de usuarios existentes: <rol>2026
 * 2. Crea cuentas de prueba para docentes, estudiantes y padres
 *
 * Uso: node scripts/seed-test-users.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { PrismaClient }  from '@prisma/client'

// ─── Cargar .env manualmente ───────────────────────────────────────────────────
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath   = resolve(__dirname, '../apps/api/.env')
const envLines  = readFileSync(envPath, 'utf-8').split('\n')
for (const line of envLines) {
  const m = line.match(/^([^#=]+)=["']?(.+?)["']?\s*$/)
  if (m) process.env[m[1].trim()] = m[2].trim()
}

const SUPABASE_URL              = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const DATABASE_URL              = process.env.DIRECT_URL  // usar DIRECT_URL para scripts

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en apps/api/.env')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const prisma = new PrismaClient({ datasources: { db: { url: DATABASE_URL } } })

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function setPassword(supabaseAuthId, password) {
  const { error } = await supabase.auth.admin.updateUserById(supabaseAuthId, { password })
  if (error) throw new Error(`Error actualizando contraseña: ${error.message}`)
}

async function createSupabaseUser(email, password) {
  const { data, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true })
  if (error) {
    if (error.message.toLowerCase().includes('already')) {
      const { data: listing } = await supabase.auth.admin.listUsers({ perPage: 1000 })
      const found = listing?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase())
      if (found) return found.id
    }
    throw new Error(`Error creando usuario Supabase: ${error.message}`)
  }
  return data.user.id
}

// ─── 1. Cambiar contraseñas de usuarios existentes ───────────────────────────

const ROL_PASSWORD = {
  ADMIN_SISTEMA: 'admin2026',
  DIRECTOR:      'director2026',
  COORDINADOR:   'coordinador2026',
  SECRETARIA:    'secretaria2026',
  REGENTE:       'regente2026',
  CONTADOR:      'contador2026',
}

console.log('\n🔑 Actualizando contraseñas de usuarios existentes...\n')

const existingUsers = await prisma.usuario.findMany({
  where: { rol: { in: Object.keys(ROL_PASSWORD) } },
  select: { id: true, supabase_auth_id: true, email: true, rol: true, nombre: true, apellido: true },
})

const summary = []

for (const user of existingUsers) {
  const newPassword = ROL_PASSWORD[user.rol]
  if (!newPassword) continue
  try {
    await setPassword(user.supabase_auth_id, newPassword)
    summary.push({ ...user, password: newPassword, accion: 'actualizado' })
    console.log(`  ✓ ${user.rol.padEnd(15)} ${user.email.padEnd(35)} → ${newPassword}`)
  } catch (e) {
    console.error(`  ✗ ${user.email}: ${e.message}`)
  }
}

// ─── 2. Crear cuentas de prueba ───────────────────────────────────────────────

const institucion = await prisma.institucion.findFirst()
if (!institucion) { console.error('No hay institución en la base de datos.'); process.exit(1) }

// Obtener gestión activa para matricular estudiantes
const gestion = await prisma.gestion.findFirst({ where: { activa: true } })
const paralelo = gestion ? await prisma.paralelo.findFirst({
  include: { grado: { include: { nivel: true } } },
}) : null

console.log('\n👥 Creando cuentas de prueba...\n')

const TEST_DOCENTES = [
  { nombre: 'Marco',   apellido: 'Quispe',   email: 'docente1@edusync.test' },
  { nombre: 'Carla',   apellido: 'Mamani',   email: 'docente2@edusync.test' },
  { nombre: 'Roberto', apellido: 'Flores',   email: 'docente3@edusync.test' },
]

const TEST_ESTUDIANTES = [
  { nombre: 'Luis',    apellido: 'Condori',  email: 'estudiante1@edusync.test' },
  { nombre: 'Sofia',   apellido: 'Choque',   email: 'estudiante2@edusync.test' },
  { nombre: 'Diego',   apellido: 'Huanca',   email: 'estudiante3@edusync.test' },
]

const TEST_PADRES = [
  { nombre: 'Ana',     apellido: 'Condori',  email: 'padre1@edusync.test' },
  { nombre: 'Juan',    apellido: 'Choque',   email: 'padre2@edusync.test' },
]

const PASSWORD = 'edu2026'

// Docentes
for (const d of TEST_DOCENTES) {
  const existUser = await prisma.usuario.findUnique({ where: { email: d.email } })
  if (existUser) {
    await setPassword(existUser.supabase_auth_id, PASSWORD)
    summary.push({ ...d, rol: 'DOCENTE', password: PASSWORD, accion: 'ya existía / contraseña actualizada' })
    console.log(`  ~ DOCENTE     ${d.email.padEnd(35)} → ${PASSWORD} (ya existía)`)
    continue
  }
  const authId = await createSupabaseUser(d.email, PASSWORD)
  await prisma.docente.create({
    data: {
      usuario: {
        create: {
          supabase_auth_id: authId,
          email:            d.email,
          nombre:           d.nombre,
          apellido:         d.apellido,
          rol:              'DOCENTE',
          institucion_id:   institucion.id,
        },
      },
    },
  })
  summary.push({ ...d, rol: 'DOCENTE', password: PASSWORD, accion: 'creado' })
  console.log(`  ✓ DOCENTE     ${d.email.padEnd(35)} → ${PASSWORD}`)
}

// Estudiantes
let estudianteCount = await prisma.estudiante.count({ where: { usuario: { institucion_id: institucion.id } } })
const anno = gestion?.anno ?? new Date().getFullYear()

for (const e of TEST_ESTUDIANTES) {
  const existUser = await prisma.usuario.findUnique({ where: { email: e.email } })
  if (existUser) {
    await setPassword(existUser.supabase_auth_id, PASSWORD)
    summary.push({ ...e, rol: 'ESTUDIANTE', password: PASSWORD, accion: 'ya existía / contraseña actualizada' })
    console.log(`  ~ ESTUDIANTE  ${e.email.padEnd(35)} → ${PASSWORD} (ya existía)`)
    continue
  }
  const authId = await createSupabaseUser(e.email, PASSWORD)
  estudianteCount++
  const codigo = `EST-${anno}-${String(estudianteCount).padStart(3, '0')}`

  const nivelId = paralelo?.grado?.nivel?.id
  if (!nivelId) {
    console.warn(`  ⚠ No se encontró nivel para matricular a ${e.email}. Se crea sin matrícula.`)
  }

  const createData = {
    codigo,
    becado: false,
    usuario: {
      create: {
        supabase_auth_id: authId,
        email:            e.email,
        nombre:           e.nombre,
        apellido:         e.apellido,
        rol:              'ESTUDIANTE',
        institucion_id:   institucion.id,
      },
    },
    ...(nivelId ? { nivel: { connect: { id: nivelId } } } : {}),
    ...(paralelo && gestion ? {
      matriculas: { create: { paralelo_id: paralelo.id, gestion_id: gestion.id } },
    } : {}),
  }

  await prisma.estudiante.create({ data: createData })
  summary.push({ ...e, rol: 'ESTUDIANTE', password: PASSWORD, accion: 'creado' })
  console.log(`  ✓ ESTUDIANTE  ${e.email.padEnd(35)} → ${PASSWORD}`)
}

// Padres (vinculados a los primeros 2 estudiantes creados)
const estudiantesTest = await prisma.estudiante.findMany({
  where:   { usuario: { email: { in: TEST_ESTUDIANTES.map(e => e.email) } } },
  include: { usuario: true },
  take:    2,
})

for (let i = 0; i < TEST_PADRES.length; i++) {
  const p = TEST_PADRES[i]
  const existUser = await prisma.usuario.findUnique({ where: { email: p.email } })

  let padreUsuarioId
  if (existUser) {
    await setPassword(existUser.supabase_auth_id, PASSWORD)
    padreUsuarioId = existUser.id
    summary.push({ ...p, rol: 'PADRE_TUTOR', password: PASSWORD, accion: 'ya existía / contraseña actualizada' })
    console.log(`  ~ PADRE       ${p.email.padEnd(35)} → ${PASSWORD} (ya existía)`)
  } else {
    const authId = await createSupabaseUser(p.email, PASSWORD)
    const padre = await prisma.usuario.create({
      data: {
        supabase_auth_id: authId,
        email:            p.email,
        nombre:           p.nombre,
        apellido:         p.apellido,
        rol:              'PADRE_TUTOR',
        institucion_id:   institucion.id,
      },
    })
    padreUsuarioId = padre.id
    summary.push({ ...p, rol: 'PADRE_TUTOR', password: PASSWORD, accion: 'creado' })
    console.log(`  ✓ PADRE       ${p.email.padEnd(35)} → ${PASSWORD}`)
  }

  // Vincular padre con el estudiante correspondiente
  const hijo = estudiantesTest[i]
  if (hijo) {
    await prisma.relacionPadreHijo.upsert({
      where:  { padre_id_estudiante_id: { padre_id: padreUsuarioId, estudiante_id: hijo.id } },
      create: { padre_id: padreUsuarioId, estudiante_id: hijo.id },
      update: {},
    })
    console.log(`     → vinculado a ${hijo.usuario.apellido}, ${hijo.usuario.nombre}`)
  }
}

// ─── 3. Resumen final ─────────────────────────────────────────────────────────

console.log('\n' + '═'.repeat(85))
console.log('RESUMEN DE CUENTAS DE USUARIO — EduSync')
console.log('═'.repeat(85))
console.log(`${'ROL'.padEnd(16)} ${'NOMBRE'.padEnd(22)} ${'EMAIL'.padEnd(35)} CONTRASEÑA`)
console.log('─'.repeat(85))

const allUsers = await prisma.usuario.findMany({
  where: { activo: true },
  orderBy: [{ rol: 'asc' }, { apellido: 'asc' }],
  select: { nombre: true, apellido: true, email: true, rol: true },
})

const ROL_ALL_PWD = {
  ADMIN_SISTEMA: 'admin2026',
  DIRECTOR:      'director2026',
  COORDINADOR:   'coordinador2026',
  SECRETARIA:    'secretaria2026',
  REGENTE:       'regente2026',
  CONTADOR:      'contador2026',
  DOCENTE:       'edu2026',
  ESTUDIANTE:    'edu2026',
  PADRE_TUTOR:   'edu2026',
}

for (const u of allUsers) {
  const pwd = ROL_ALL_PWD[u.rol] ?? '???'
  const nombre = `${u.apellido}, ${u.nombre}`
  console.log(`${u.rol.padEnd(16)} ${nombre.padEnd(22)} ${u.email.padEnd(35)} ${pwd}`)
}

console.log('═'.repeat(85))
console.log()

await prisma.$disconnect()
