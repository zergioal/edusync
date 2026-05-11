/**
 * Script para crear una nueva institución en EduSync.
 *
 * Uso:
 *   cd packages/database
 *   tsx scripts/nueva-institucion.ts \
 *     --nombre "U.E. Salesianos" \
 *     --subdominio "salesianos" \
 *     --tipo BTH \
 *     --admin-email "admin@salesianos.edu.bo"
 */

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'

const prisma  = new PrismaClient()
const supabase = createClient(
  process.env['SUPABASE_URL']!,
  process.env['SUPABASE_SERVICE_ROLE_KEY']!,
)

// ─── Parseo de argumentos ─────────────────────────────────────────────────────

function getArg(name: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`)
  return idx >= 0 ? process.argv[idx + 1] : undefined
}

function requireArg(name: string): string {
  const val = getArg(name)
  if (!val) { console.error(`Falta argumento --${name}`); process.exit(1) }
  return val
}

// ─── Datos por defecto de niveles ─────────────────────────────────────────────

const NIVELES_DEFAULT = [
  {
    nombre: 'INICIAL',
    grados: ['Inicial 1', 'Inicial 2'],
  },
  {
    nombre: 'PRIMARIA',
    grados: ['1ro Primaria','2do Primaria','3ro Primaria','4to Primaria','5to Primaria','6to Primaria'],
  },
  {
    nombre: 'SECUNDARIA',
    grados: ['1ro Secundaria','2do Secundaria','3ro Secundaria','4to Secundaria','5to Secundaria','6to Secundaria'],
  },
]

const DIMENSIONES_DEFAULT = [
  { nombre: 'SER Y DECIDIR',  puntaje_max: 10, orden: 0 },
  { nombre: 'SABER',          puntaje_max: 45, orden: 1 },
  { nombre: 'HACER',          puntaje_max: 40, orden: 2 },
  { nombre: 'AUTOEVALUACIÓN', puntaje_max: 5,  orden: 3 },
]

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const nombre       = requireArg('nombre')
  const subdominio   = requireArg('subdominio').toLowerCase()
  const tipo         = getArg('tipo') ?? 'HUMANISTICA'
  const adminEmail   = requireArg('admin-email')
  const adminPass    = `EduSync${new Date().getFullYear()}#`

  console.log(`\n🏫 Creando institución: ${nombre} (${subdominio})`)
  console.log(`   Tipo: ${tipo} | Admin: ${adminEmail}\n`)

  // 1. Institución
  const inst = await prisma.institucion.create({
    data: { nombre, subdominio, activa: true },
  })
  console.log(`✓ Institución creada: ${inst.id}`)

  // 2. Configuración inicial
  await prisma.configInstitucional.create({
    data: {
      institucion_id:       inst.id,
      tipo_ue:              tipo,
      duracion_periodo_min: 40,
    },
  })

  // 3. Turno por defecto
  const turno = await prisma.turno.create({
    data: { nombre: 'Mañana', tipo: 'MANANA', activo: true, institucion_id: inst.id },
  })

  // 4. Niveles, grados y HorarioNivel
  let gradosCreados = 0
  for (const nivelDef of NIVELES_DEFAULT) {
    const nivel = await prisma.nivel.create({
      data: {
        nombre:         nivelDef.nombre as 'INICIAL' | 'PRIMARIA' | 'SECUNDARIA',
        institucion_id: inst.id,
      },
    })

    // HorarioNivel para el turno
    await prisma.horarioNivel.create({
      data: {
        turno_id:        turno.id,
        nivel_id:        nivel.id,
        hora_inicio:     '07:30',
        minutos_lectura: 15,
        max_periodos_dia: 8,
        recreos:         [{ despues_de_periodo: 3, duracion_min: 20 }],
      },
    })

    for (let i = 0; i < nivelDef.grados.length; i++) {
      await prisma.grado.create({
        data: {
          nombre:   nivelDef.grados[i]!,
          orden:    i + 1,
          nivel_id: nivel.id,
        },
      })
      gradosCreados++
    }
  }
  console.log(`✓ Niveles y ${gradosCreados} grados creados`)

  // 5. Dimensiones de calificación
  await prisma.dimension.createMany({
    data: DIMENSIONES_DEFAULT.map(d => ({ ...d, institucion_id: inst.id })),
  })
  console.log(`✓ ${DIMENSIONES_DEFAULT.length} dimensiones creadas`)

  // 6. Usuario ADMIN_SISTEMA en Supabase + local
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: adminEmail,
    password: adminPass,
    email_confirm: true,
  })
  if (authError) throw new Error(`Supabase Auth error: ${authError.message}`)

  await prisma.usuario.create({
    data: {
      supabase_uid:   authData.user!.id,
      email:          adminEmail,
      nombre:         'Administrador',
      apellido:       inst.nombre,
      rol:            'ADMIN_SISTEMA',
      institucion_id: inst.id,
    },
  })
  console.log(`✓ Usuario admin creado: ${adminEmail}`)

  // 7. Resumen
  console.log(`
╔══════════════════════════════════════════════════════╗
║  Institución creada exitosamente                     ║
╠══════════════════════════════════════════════════════╣
║  Nombre:      ${nombre.padEnd(37)}║
║  Subdominio:  ${(subdominio + '.edusync.bo').padEnd(37)}║
║  Tipo:        ${tipo.padEnd(37)}║
╠══════════════════════════════════════════════════════╣
║  Admin email: ${adminEmail.padEnd(37)}║
║  Admin pass:  ${adminPass.padEnd(37)}║
╚══════════════════════════════════════════════════════╝
⚠  Cambia la contraseña del admin en el primer inicio de sesión.
`)
}

main()
  .catch(e => { console.error('Error:', e.message); process.exit(1) })
  .finally(() => prisma.$disconnect())
