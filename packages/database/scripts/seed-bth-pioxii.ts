/**
 * Seed BTH (Bachillerato Técnico Humanístico) — U.E. Pío XII
 *
 * Configura:
 *  - carrera_tecnica en la institución
 *  - Sub-áreas de Técnica Tecnológica (TTE) para 5to/6to Secundaria
 *  - 4 docentes BTH con sus asignaciones en 5to Secundaria A, gestión 2026
 *
 * Uso:
 *   cd packages/database
 *   tsx scripts/seed-bth-pioxii.ts
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'
import { PrismaClient } from '@prisma/client'

// Load env from database package .env (relative to this script's location)
try {
  const envContent = readFileSync(resolve(__dirname, '../.env'), 'utf-8')
  for (const line of envContent.split('\n')) {
    const match = line.match(/^([A-Z_][A-Z0-9_]*)="?([^"\n]*)"?\s*$/)
    if (match && !process.env[match[1]!]) process.env[match[1]!] = match[2]!
  }
} catch { /* rely on process.env */ }

const prisma = new PrismaClient()

const SUPABASE_URL       = process.env['SUPABASE_URL'] ?? ''
const SERVICE_ROLE_KEY   = process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? ''
const PASSWORD           = 'EduSync2026#'
const SUBDOMINIO         = 'pioxii'
const CARRERA_TECNICA    = 'Administración de Empresas'
const GESTION_ANNO       = 2026
const PARALELO_GRADO     = '5° de Secundaria'
const PARALELO_LETRA     = 'A'

// ─── Sub-áreas TTE ────────────────────────────────────────────────────────────

const SUBAREAS_TTE = [
  { nombre: 'Proyectos',              horas_semanales: 16 },
  { nombre: 'Contabilidad',           horas_semanales: 8  },
  { nombre: 'Administración',         horas_semanales: 8  },
  { nombre: 'Matemática Financiera',  horas_semanales: 8  },
  { nombre: 'Legislación Laboral',    horas_semanales: 8  },
]

// ─── Docentes BTH ─────────────────────────────────────────────────────────────

const DOCENTES_BTH = [
  {
    email:    'c.soto@pioxii.edu.bo',
    nombre:   'Catherine Lenny',
    apellido: 'Soto Lira',
    subareas: ['Proyectos'],
  },
  {
    email:    'n.perez@pioxii.edu.bo',
    nombre:   'Nivia Emely',
    apellido: 'Perez Quilo',
    subareas: ['Contabilidad'],
  },
  {
    email:    'm.coca@pioxii.edu.bo',
    nombre:   'Maria Bertha',
    apellido: 'Coca Rojas',
    subareas: ['Administración', 'Legislación Laboral'],
  },
  {
    email:    'o.orellana@pioxii.edu.bo',
    nombre:   'Oscar Leonid',
    apellido: 'Orellana Martinez',
    subareas: ['Matemática Financiera'],
  },
]

// ─── Supabase helper ──────────────────────────────────────────────────────────

async function getOrCreateSupabaseUser(email: string, password: string): Promise<string> {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.warn(`⚠  Sin credenciales Supabase — usando ID fake para ${email}`)
    return `seed-bth-${email.split('@')[0]}`
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
  console.log('\n🏫 Iniciando seed BTH — U.E. Pío XII\n')

  // 1. Institución
  const inst = await prisma.institucion.findUniqueOrThrow({ where: { subdominio: SUBDOMINIO } })
  await prisma.institucion.update({
    where: { id: inst.id },
    data:  { carrera_tecnica: CARRERA_TECNICA },
  })
  console.log(`✅ carrera_tecnica = "${CARRERA_TECNICA}"`)

  // 2. Encontrar TTE (Técnica Tecnológica) en Secundaria
  const nivelSec = await prisma.nivel.findFirstOrThrow({
    where: { institucion_id: inst.id, nombre: 'SECUNDARIA' },
  })

  const tte = await prisma.materia.findFirst({
    where: { nivel_id: nivelSec.id, nombre: { contains: 'Técnica Tecnológica' } },
  })
  if (!tte) throw new Error('Materia "Técnica Tecnológica" no encontrada en Secundaria. Ejecuta el seed principal primero.')

  await prisma.materia.update({
    where: { id: tte.id },
    data:  { tiene_subareas: true },
  })
  console.log(`✅ tiene_subareas = true para "${tte.nombre}" (${tte.id})`)

  // 3. Crear sub-áreas TTE
  const subAreaMap: Record<string, string> = {}
  for (const sa of SUBAREAS_TTE) {
    const existing = await prisma.materia.findFirst({
      where: { es_subarea_de_id: tte.id, nombre: sa.nombre },
    })
    const subArea = existing
      ? await prisma.materia.update({ where: { id: existing.id }, data: { horas_semanales: sa.horas_semanales } })
      : await prisma.materia.create({
          data: {
            nombre:           sa.nombre,
            campo_id:         tte.campo_id,
            nivel_id:         tte.nivel_id,
            activa:           true,
            tiene_subareas:   false,
            es_subarea_de_id: tte.id,
            horas_semanales:  sa.horas_semanales,
            solo_si_bth:      true,
          },
        })
    subAreaMap[sa.nombre] = subArea.id
    console.log(`   • Sub-área: ${sa.nombre} (${sa.horas_semanales}h/sem) → ${subArea.id}`)
  }
  console.log(`✅ ${SUBAREAS_TTE.length} sub-áreas TTE listas`)

  // 4. Gestión 2026
  const gestion = await prisma.gestion.findFirstOrThrow({
    where: { institucion_id: inst.id, anno: GESTION_ANNO },
  })
  console.log(`✅ Gestión ${GESTION_ANNO} encontrada (${gestion.id})`)

  // 5. Paralelo 5to Secundaria A
  const grado5to = await prisma.grado.findFirst({
    where: { nivel: { institucion_id: inst.id, nombre: 'SECUNDARIA' }, nombre: PARALELO_GRADO },
  })
  if (!grado5to) throw new Error(`Grado "${PARALELO_GRADO}" no encontrado. Asegúrate de tener el grado creado.`)

  const paralelo5A = await prisma.paralelo.findFirst({
    where: { grado_id: grado5to.id, letra: PARALELO_LETRA },
  })
  if (!paralelo5A) throw new Error(`Paralelo ${PARALELO_GRADO} "${PARALELO_LETRA}" no encontrado.`)
  console.log(`✅ Paralelo ${PARALELO_GRADO} "${PARALELO_LETRA}" encontrado (${paralelo5A.id})`)

  // 6. Crear docentes BTH + asignaciones
  for (const d of DOCENTES_BTH) {
    // Supabase Auth
    const authId = await getOrCreateSupabaseUser(d.email, PASSWORD)

    // Usuario
    const usuario = await prisma.usuario.upsert({
      where:  { email: d.email },
      create: {
        institucion_id:  inst.id,
        supabase_auth_id: authId,
        email:           d.email,
        rol:             'DOCENTE',
        nombre:          d.nombre,
        apellido:        d.apellido,
        activo:          true,
      },
      update: { supabase_auth_id: authId },
    })

    // Registro Docente
    const docente = await prisma.docente.upsert({
      where:  { usuario_id: usuario.id },
      create: { usuario_id: usuario.id },
      update: {},
    })

    // Asignaciones
    for (const subareaNombre of d.subareas) {
      const materiaId = subAreaMap[subareaNombre]
      if (!materiaId) throw new Error(`Sub-área "${subareaNombre}" no encontrada`)

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
      console.log(`   → ${d.nombre} ${d.apellido}: ${subareaNombre}`)
    }
  }
  console.log(`✅ ${DOCENTES_BTH.length} docentes BTH creados con asignaciones`)

  console.log(`
╔══════════════════════════════════════════════════════╗
║  Seed BTH completado exitosamente                    ║
╠══════════════════════════════════════════════════════╣
║  Carrera técnica: ${CARRERA_TECNICA.padEnd(33)}║
║  Sub-áreas TTE:   ${SUBAREAS_TTE.length} materias creadas             ║
║  Docentes BTH:    ${DOCENTES_BTH.length} docentes con asignaciones      ║
║  Paralelo:        ${(PARALELO_GRADO + ' "' + PARALELO_LETRA + '"').padEnd(33)}║
╚══════════════════════════════════════════════════════╝
📧 Password: ${PASSWORD}
`)
}

main()
  .catch(e => { console.error('❌ Error en seed BTH:', e.message ?? e); process.exit(1) })
  .finally(() => prisma.$disconnect())
