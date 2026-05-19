/**
 * Seed: Docentes regulares 5to A Secundaria — U.E. Pío XII
 *
 * Agrega los 11 docentes de las materias regulares asignados a 5to A Secundaria
 * (gestión 2026) que no fueron incluidos en el seed BTH.
 *
 * Uso:
 *   cd packages/database
 *   tsx scripts/seed-docentes-5toa.ts
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'
import { PrismaClient } from '@prisma/client'

// Load env from packages/database/.env
try {
  const envContent = readFileSync(resolve(__dirname, '../.env'), 'utf-8')
  for (const line of envContent.split('\n')) {
    const match = line.match(/^([A-Z_][A-Z0-9_]*)="?([^"\n]*)"?\s*$/)
    if (match && !process.env[match[1]!]) process.env[match[1]!] = match[2]!
  }
} catch { /* rely on process.env */ }

const prisma = new PrismaClient()

const SUPABASE_URL     = process.env['SUPABASE_URL'] ?? ''
const SERVICE_ROLE_KEY = process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? ''
const PASSWORD         = 'EduSync2026#'
const SUBDOMINIO       = 'pioxii'
const GESTION_ANNO     = 2026
const PARALELO_GRADO   = '5° de Secundaria'
const PARALELO_LETRA   = 'A'

// ─── Docentes + materias (5to A Secundaria) ───────────────────────────────────

// Nombres de materia tal como existen en la DB (consultado con _check-materias.ts)
const DOCENTES = [
  {
    email:    'n.lopez@pioxii.edu.bo',
    nombre:   'Norka',
    apellido: 'Lopez Delgadillo',
    materias: ['Cosmovisiones, Filosofía y Psicología'],
  },
  {
    email:    's.alcocer@pioxii.edu.bo',
    nombre:   'Sergio Mauricio',
    apellido: 'Alcocer Valenzuela',
    materias: ['Matemática'],
  },
  {
    email:    'd.villarroel@pioxii.edu.bo',
    nombre:   'David',
    apellido: 'Villarroel Loroñez',
    materias: ['Ciencias Sociales'],
  },
  {
    email:    'c.santacruz@pioxii.edu.bo',
    nombre:   'Claudia Yesenia',
    apellido: 'Santa Cruz Mancilla',
    materias: ['Artes Plásticas y Visuales'],
  },
  {
    email:    'r.claros@pioxii.edu.bo',
    nombre:   'Raul',
    apellido: 'Claros Coca',
    materias: ['Ciencias Naturales: Biología-Geografía'],
  },
  {
    email:    'j.melgarejo@pioxii.edu.bo',
    nombre:   'Jose',
    apellido: 'Melgarejo Vargas',
    materias: ['Educación Musical'],
  },
  {
    email:    's.garcia@pioxii.edu.bo',
    nombre:   'Sarah Yelmy Cecil',
    apellido: 'Garcia Ferrufino',
    materias: ['Ciencias Naturales: Química'],
  },
  {
    email:    'j.torrico@pioxii.edu.bo',
    nombre:   'Jose Luis',
    apellido: 'Torrico Aliaga',
    materias: ['Valores, Espiritualidades y Religiones'],
  },
  {
    email:    'j.escobar@pioxii.edu.bo',
    nombre:   'Janeth Wendy',
    apellido: 'Escobar Jimenez',
    materias: ['Lengua Extranjera'],
  },
  {
    email:    'r.granado@pioxii.edu.bo',
    nombre:   'Raquel',
    apellido: 'Granado Gomez',
    materias: ['Educación Física y Deportes'],
  },
  {
    // Lengua Castellana y Originaria están combinadas en una sola materia en la DB
    email:    'c.rojas@pioxii.edu.bo',
    nombre:   'Carla',
    apellido: 'Rojas Moscoso',
    materias: ['Comunicación y Lenguajes: Lengua Castellana y Originaria'],
  },
]

// ─── Supabase helper ──────────────────────────────────────────────────────────

async function getOrCreateSupabaseUser(email: string, password: string): Promise<string> {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.warn(`⚠  Sin credenciales Supabase — usando ID fake para ${email}`)
    return `seed-${email.split('@')[0]}`
  }

  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'apikey':        SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ email, password, email_confirm: true }),
  })

  if (res.ok) {
    const data = await res.json() as { id: string }
    return data.id
  }

  const err = await res.json() as { msg?: string; message?: string }
  if ((err.msg ?? err.message ?? '').includes('already been registered')) {
    const listRes  = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=1000`, {
      headers: { 'apikey': SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SERVICE_ROLE_KEY}` },
    })
    const listData = await listRes.json() as { users?: { id: string; email: string }[] }
    const found    = listData.users?.find(u => u.email === email)
    if (found) return found.id
  }

  throw new Error(`Error creando usuario Supabase ${email}: ${JSON.stringify(err)}`)
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n📚 Seed: Docentes regulares 5to A Secundaria — U.E. Pío XII\n')

  const inst = await prisma.institucion.findUniqueOrThrow({ where: { subdominio: SUBDOMINIO } })

  const nivelSec = await prisma.nivel.findFirstOrThrow({
    where: { institucion_id: inst.id, nombre: 'SECUNDARIA' },
  })

  // Fetch all materias for this nivel
  const todasMaterias = await prisma.materia.findMany({
    where: { nivel_id: nivelSec.id, activa: true, es_subarea_de_id: null },
    select: { id: true, nombre: true },
  })
  const materiaByNombre = Object.fromEntries(todasMaterias.map(m => [m.nombre, m.id]))

  const gestion = await prisma.gestion.findFirstOrThrow({
    where: { institucion_id: inst.id, anno: GESTION_ANNO },
  })

  const grado5to = await prisma.grado.findFirstOrThrow({
    where: { nivel: { institucion_id: inst.id, nombre: 'SECUNDARIA' }, nombre: PARALELO_GRADO },
  })

  const paralelo5A = await prisma.paralelo.findFirstOrThrow({
    where: { grado_id: grado5to.id, letra: PARALELO_LETRA },
  })
  console.log(`✅ Paralelo: ${PARALELO_GRADO} "${PARALELO_LETRA}" (${paralelo5A.id})`)
  console.log(`✅ Gestión: ${GESTION_ANNO} (${gestion.id})\n`)

  let creados = 0
  for (const d of DOCENTES) {
    const authId = await getOrCreateSupabaseUser(d.email, PASSWORD)

    const usuario = await prisma.usuario.upsert({
      where:  { email: d.email },
      create: {
        institucion_id:   inst.id,
        supabase_auth_id: authId,
        email:            d.email,
        rol:              'DOCENTE',
        nombre:           d.nombre,
        apellido:         d.apellido,
        activo:           true,
      },
      update: { supabase_auth_id: authId },
    })

    const docente = await prisma.docente.upsert({
      where:  { usuario_id: usuario.id },
      create: { usuario_id: usuario.id },
      update: {},
    })

    for (const materiaNombre of d.materias) {
      const materiaId = materiaByNombre[materiaNombre]
      if (!materiaId) {
        console.warn(`  ⚠  Materia no encontrada: "${materiaNombre}" — verifica el seed principal`)
        continue
      }
      await prisma.asignacion.upsert({
        where: {
          docente_id_materia_id_paralelo_id_gestion_id: {
            docente_id:  docente.id,
            materia_id:  materiaId,
            paralelo_id: paralelo5A.id,
            gestion_id:  gestion.id,
          },
        },
        create: {
          docente_id:  docente.id,
          materia_id:  materiaId,
          paralelo_id: paralelo5A.id,
          gestion_id:  gestion.id,
        },
        update: {},
      })
      console.log(`  ✓ ${d.apellido}, ${d.nombre} → ${materiaNombre}`)
    }
    creados++
  }

  console.log(`
╔══════════════════════════════════════════════════════╗
║  Seed completado exitosamente                        ║
╠══════════════════════════════════════════════════════╣
║  Docentes creados: ${String(creados).padEnd(34)}║
║  Paralelo:         ${(PARALELO_GRADO + ' "' + PARALELO_LETRA + '"').padEnd(33)}║
║  Gestión:          ${String(GESTION_ANNO).padEnd(33)}║
╚══════════════════════════════════════════════════════╝
📧 Password: ${PASSWORD}
`)
}

main()
  .catch(e => { console.error('❌ Error en seed:', e.message ?? e); process.exit(1) })
  .finally(() => prisma.$disconnect())
