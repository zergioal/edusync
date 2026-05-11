/**
 * seed-test-users.ts — cambiar contraseñas + crear cuentas de prueba
 * Uso: npx tsx src/scripts/seed-test-users.ts  (desde apps/api)
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { PrismaClient }  from '@prisma/client'

async function main() {
  const SUPABASE_URL = process.env['SUPABASE_URL']!
  const SERVICE_KEY  = process.env['SUPABASE_SERVICE_ROLE_KEY']!
  const DIRECT_URL   = process.env['DIRECT_URL']!

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const prisma = new PrismaClient({ datasources: { db: { url: DIRECT_URL } } })

  async function setPassword(authId: string, password: string) {
    const { error } = await supabase.auth.admin.updateUserById(authId, { password })
    if (error) throw new Error(error.message)
  }

  async function createSupabaseUser(email: string, password: string): Promise<string> {
    const { data, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true })
    if (!error) return data.user.id
    if (error.message.toLowerCase().includes('already')) {
      const { data: list } = await supabase.auth.admin.listUsers({ perPage: 1000 })
      const found = list?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase())
      if (found) return found.id
    }
    throw new Error(error.message)
  }

  // ─── 1. Cambiar contraseñas de staff existente ─────────────────────────────

  const ROL_PWD: Record<string, string> = {
    ADMIN_SISTEMA: 'admin2026',
    DIRECTOR:      'director2026',
    COORDINADOR:   'coordinador2026',
    SECRETARIA:    'secretaria2026',
    REGENTE:       'regente2026',
    CONTADOR:      'contador2026',
  }

  console.log('\n🔑  Actualizando contraseñas de staff existente...\n')

  const staffUsers = await prisma.usuario.findMany({
    where:  { rol: { in: Object.keys(ROL_PWD) as any[] } },
    select: { supabase_auth_id: true, email: true, rol: true, nombre: true, apellido: true },
  })

  for (const u of staffUsers) {
    const pwd = ROL_PWD[u.rol]!
    try {
      await setPassword(u.supabase_auth_id, pwd)
      console.log(`  ✓  ${u.rol.padEnd(15)} ${u.email.padEnd(40)} → ${pwd}`)
    } catch (e: any) {
      console.error(`  ✗  ${u.email}: ${e.message}`)
    }
  }

  // ─── 2. Crear cuentas de prueba ────────────────────────────────────────────

  const inst = await prisma.institucion.findFirst()
  if (!inst) { console.error('\nNo hay institución en BD.'); process.exit(1) }

  const gestion  = await prisma.gestion.findFirst({ where: { activa: true } })
  const paralelo = await prisma.paralelo.findFirst({
    include: { grado: { include: { nivel: true } } },
  })

  const anno = gestion?.anno ?? new Date().getFullYear()
  const PWD  = 'edu2026'

  console.log('\n👥  Creando / actualizando cuentas de prueba...\n')

  const TEST_DOCENTES = [
    { nombre: 'Marco',   apellido: 'Quispe',  email: 'docente1@edusync.test' },
    { nombre: 'Carla',   apellido: 'Mamani',  email: 'docente2@edusync.test' },
    { nombre: 'Roberto', apellido: 'Flores',  email: 'docente3@edusync.test' },
  ]

  for (const d of TEST_DOCENTES) {
    const existing = await prisma.usuario.findUnique({ where: { email: d.email } })
    if (existing) {
      await setPassword(existing.supabase_auth_id, PWD)
      console.log(`  ~  DOCENTE    ${d.email.padEnd(40)} → ${PWD}  (ya existía)`)
      continue
    }
    const authId = await createSupabaseUser(d.email, PWD)
    await prisma.docente.create({
      data: {
        usuario: {
          create: {
            supabase_auth_id: authId,
            email:            d.email,
            nombre:           d.nombre,
            apellido:         d.apellido,
            rol:              'DOCENTE',
            institucion_id:   inst.id,
          },
        },
      },
    })
    console.log(`  ✓  DOCENTE    ${d.email.padEnd(40)} → ${PWD}`)
  }

  const TEST_ESTUDIANTES = [
    { nombre: 'Luis',  apellido: 'Condori', email: 'estudiante1@edusync.test' },
    { nombre: 'Sofia', apellido: 'Choque',  email: 'estudiante2@edusync.test' },
    { nombre: 'Diego', apellido: 'Huanca',  email: 'estudiante3@edusync.test' },
  ]

  let estCount = await prisma.estudiante.count({ where: { usuario: { institucion_id: inst.id } } })

  for (const e of TEST_ESTUDIANTES) {
    const existing = await prisma.usuario.findUnique({ where: { email: e.email } })
    if (existing) {
      await setPassword(existing.supabase_auth_id, PWD)
      console.log(`  ~  ESTUDIANTE ${e.email.padEnd(40)} → ${PWD}  (ya existía)`)
      continue
    }
    const authId  = await createSupabaseUser(e.email, PWD)
    estCount++
    const codigo  = `EST-${anno}-${String(estCount).padStart(3, '0')}`
    const nivelId = paralelo?.grado?.nivel?.id

    await prisma.estudiante.create({
      data: {
        codigo,
        becado: false,
        ...(nivelId ? { nivel: { connect: { id: nivelId } } } : {}),
        usuario: {
          create: {
            supabase_auth_id: authId,
            email:            e.email,
            nombre:           e.nombre,
            apellido:         e.apellido,
            rol:              'ESTUDIANTE',
            institucion_id:   inst.id,
          },
        },
        ...(paralelo && gestion ? {
          matriculas: { create: { paralelo_id: paralelo.id, gestion_id: gestion.id } },
        } : {}),
      },
    })
    console.log(`  ✓  ESTUDIANTE ${e.email.padEnd(40)} → ${PWD}`)
  }

  const TEST_PADRES = [
    { nombre: 'Ana',  apellido: 'Condori', email: 'padre1@edusync.test' },
    { nombre: 'Juan', apellido: 'Choque',  email: 'padre2@edusync.test' },
  ]

  const hijosVinculo = await prisma.estudiante.findMany({
    where:   { usuario: { email: { in: TEST_ESTUDIANTES.map(e => e.email) } } },
    include: { usuario: true },
    take:    2,
  })

  for (let i = 0; i < TEST_PADRES.length; i++) {
    const p = TEST_PADRES[i]!
    let padreId: string

    const existing = await prisma.usuario.findUnique({ where: { email: p.email } })
    if (existing) {
      await setPassword(existing.supabase_auth_id, PWD)
      padreId = existing.id
      console.log(`  ~  PADRE      ${p.email.padEnd(40)} → ${PWD}  (ya existía)`)
    } else {
      const authId = await createSupabaseUser(p.email, PWD)
      const padre  = await prisma.usuario.create({
        data: {
          supabase_auth_id: authId,
          email:            p.email,
          nombre:           p.nombre,
          apellido:         p.apellido,
          rol:              'PADRE_TUTOR',
          institucion_id:   inst.id,
        },
      })
      padreId = padre.id
      console.log(`  ✓  PADRE      ${p.email.padEnd(40)} → ${PWD}`)
    }

    const hijo = hijosVinculo[i]
    if (hijo) {
      await prisma.relacionPadreHijo.upsert({
        where:  { padre_id_estudiante_id: { padre_id: padreId, estudiante_id: hijo.id } },
        create: { padre_id: padreId, estudiante_id: hijo.id },
        update: {},
      })
      console.log(`     → vinculado a ${hijo.usuario.apellido}, ${hijo.usuario.nombre}`)
    }
  }

  // ─── 3. Forzar contraseña en TODOS los DOCENTE/ESTUDIANTE/PADRE_TUTOR ───────

  console.log('\n🔄  Actualizando contraseñas de todos los docentes, estudiantes y padres...\n')

  const allNonStaff = await prisma.usuario.findMany({
    where:  { rol: { in: ['DOCENTE', 'ESTUDIANTE', 'PADRE_TUTOR'] as any[] }, activo: true },
    select: { supabase_auth_id: true, email: true, rol: true },
  })

  for (const u of allNonStaff) {
    try {
      await setPassword(u.supabase_auth_id, PWD)
      console.log(`  ✓  ${u.rol.padEnd(12)} ${u.email.padEnd(40)} → ${PWD}`)
    } catch (e: any) {
      console.error(`  ✗  ${u.email}: ${e.message}`)
    }
  }

  // ─── 4. Resumen ────────────────────────────────────────────────────────────

  const ROL_ALL: Record<string, string> = {
    ...ROL_PWD,
    DOCENTE:     'edu2026',
    ESTUDIANTE:  'edu2026',
    PADRE_TUTOR: 'edu2026',
  }

  const allUsers = await prisma.usuario.findMany({
    where:   { activo: true },
    orderBy: [{ rol: 'asc' }, { apellido: 'asc' }],
    select:  { nombre: true, apellido: true, email: true, rol: true },
  })

  const LINE = '═'.repeat(90)
  console.log('\n' + LINE)
  console.log('  RESUMEN DE CUENTAS — EduSync')
  console.log(LINE)
  console.log(`  ${'ROL'.padEnd(16)} ${'NOMBRE'.padEnd(24)} ${'EMAIL'.padEnd(38)} CONTRASEÑA`)
  console.log('  ' + '─'.repeat(86))

  for (const u of allUsers) {
    const pwd    = ROL_ALL[u.rol] ?? '???'
    const nombre = `${u.apellido}, ${u.nombre}`.slice(0, 23)
    console.log(`  ${u.rol.padEnd(16)} ${nombre.padEnd(24)} ${u.email.padEnd(38)} ${pwd}`)
  }

  console.log(LINE + '\n')

  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
