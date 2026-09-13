/**
 * actualizar-docentes-2026.ts — Actualiza el correo institucional de los docentes
 * que ya existen en el sistema y crea la cuenta de los que faltan, según
 * "LISTA DOCENTES.pdf" (29 docentes, con su correo institucional real).
 *
 * Algunos miembros de personal administrativo (Director, Coordinador, etc.)
 * también dan clases en este colegio, así que tienen una cuenta de Docente
 * SEPARADA de su cuenta administrativa (confirmado con el usuario) — el script
 * no reutiliza ni modifica esas cuentas administrativas, crea el docente aparte.
 *
 * Por defecto corre en modo REPORTE (no escribe nada). Para escribir de verdad:
 *   npx tsx src/scripts/actualizar-docentes-2026.ts --commit   (desde apps/api)
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { PrismaClient } from '@prisma/client'

const COMMIT = process.argv.includes('--commit')
const PWD_DOCENTE = 'Docente2026#' // misma que usa docentes.service.ts al crear por la app

interface DocenteRaw { paterno: string; materno: string; nombres: string; email: string }

// ─── Datos: "LISTA DOCENTES.pdf" ───────────────────────────────────────────────
const DOCENTES: DocenteRaw[] = [
  { paterno: 'Ajhuacho',   materno: 'Flores',     nombres: 'Winsor',                    email: 'winsor.ajhuacho.flores@uepioxii.edu.bo' },
  { paterno: 'Alborta',    materno: 'Antezana',   nombres: 'Maritza Rissel',             email: 'maritza.alborta.antezana@uepioxii.edu.bo' },
  { paterno: 'Alcocer',    materno: 'Valenzuela', nombres: 'Sergio Mauricio',            email: 'alcocer.sergio.2024@uepioxii.edu.bo' },
  { paterno: 'Camacho',    materno: 'Patiño',     nombres: 'Monica Glenda',              email: 'monica.camacho2026@uepioxii.edu.bo' },
  { paterno: 'Castellon',  materno: 'Encinas',    nombres: 'Claudia',                    email: 'claudia.castellon.encinas@uepioxii.edu.bo' },
  { paterno: 'Choque',     materno: 'Villalobos', nombres: 'Nilda Corina',               email: 'corina.choque.villalobos@uepioxii.edu.bo' },
  { paterno: 'Claros',     materno: 'Coca',       nombres: 'Raul',                       email: 'raulclaros2026@uepioxii.edu.bo' },
  { paterno: 'Claure',     materno: 'Alba',       nombres: 'Mariel',                     email: 'mariel.claure.alba@uepioxii.edu.bo' },
  { paterno: 'Coca',       materno: 'Rojas',      nombres: 'Maria Bertha',               email: 'maria.coca.rojas@uepioxii.edu.bo' },
  { paterno: 'Escobar',    materno: 'Jimenez',    nombres: 'Janeth Wendy',               email: 'janeth.escobar.jimenez@uepioxii.edu.bo' },
  { paterno: 'Fernandez',  materno: 'Garvizu',    nombres: 'Virginia Eliana',            email: 'fernandez.garvizu.virginia@uepioxii.edu.bo' },
  { paterno: 'Flores',     materno: 'Baca',       nombres: 'Reyna Magaly',               email: 'reyna.flores.baca@uepioxii.edu.bo' },
  { paterno: 'Flores',     materno: 'Paz',        nombres: 'Genoveva Maria',             email: 'genoveva.flores.paz@uepioxii.edu.bo' },
  { paterno: 'Garcia',     materno: 'Ferrufino',  nombres: 'Sarah Yelmy Cecil',          email: 'garcia.ferrufino.sarah.2021@uepioxii.edu.bo' },
  { paterno: 'Granado',    materno: 'Gomez',      nombres: 'Raquel',                     email: 'raquel.granado.gomez@uepioxii.edu.bo' },
  { paterno: 'Lazcano',    materno: 'Davalos',    nombres: 'Juan Walter',                email: 'walter.lazcano.davalos@uepioxii.edu.bo' },
  { paterno: 'Lopez',      materno: 'Delgadillo', nombres: 'Norka',                      email: 'norka.lopez.delgadillo@uepioxii.edu.bo' },
  { paterno: 'Melgarejo',  materno: 'Vargas',     nombres: 'Jose',                       email: 'jose.melgarejo@uepioxii.edu.bo' },
  { paterno: 'Orellana',   materno: 'Martinez',   nombres: 'Oscar Leonid',               email: 'oscar.martinez@uepioxii.edu.bo' },
  { paterno: 'Perez',      materno: 'Quilo',      nombres: 'Nivia Emely',                email: 'nivia.perez.quilo@uepioxii.edu.bo' },
  { paterno: 'Rojas',      materno: 'Luque',      nombres: 'Marco Antonio',              email: 'marco.rojas.luque@uepioxii.edu.bo' },
  { paterno: 'Rojas',      materno: 'Moscoso',    nombres: 'Carla',                      email: 'carla.rojas2026@uepioxii.edu.bo' },
  { paterno: 'Rosas',      materno: 'Carrasco',   nombres: 'Isabel',                     email: 'isabel.rosas.carrasco@uepioxii.edu.bo' },
  { paterno: 'Santa Cruz', materno: 'Mancilla',   nombres: 'Claudia Yesenia',            email: 'claudia.mancilla2026@uepioxii.edu.bo' },
  { paterno: 'Soto',       materno: 'Lira',       nombres: 'Catherine Lenny',            email: 'lenny.soto2024@uepioxii.edu.bo' },
  { paterno: 'Soto',       materno: 'Rollano',    nombres: 'Villma Janeth',              email: 'villma.soto.rollano@uepioxii.edu.bo' },
  { paterno: 'Torrico',    materno: 'Aliaga',     nombres: 'Jose Luis',                  email: 'joseluis.torrico.aliaga@uepioxii.edu.bo' },
  { paterno: 'Valdez',     materno: 'Rios',       nombres: 'Alberto Andres',             email: 'alberto.valdez.rios@uepioxii.edu.bo' },
  { paterno: 'Villarroel', materno: 'Soto',       nombres: 'Martha',                     email: 'martha.villarroel.2025@uepioxii.edu.bo' },
]

function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
}
function norm(s: string): string {
  return stripAccents(s).toUpperCase().replace(/\s+/g, ' ').trim()
}
function toTitle(s: string): string {
  return s.toLowerCase().replace(/(^|\s)([a-zñáéíóúü])/g, (_, sp, ch) => sp + ch.toUpperCase())
}

async function main() {
  const SUPABASE_URL = process.env['SUPABASE_URL']!
  const SERVICE_KEY  = process.env['SUPABASE_SERVICE_ROLE_KEY']!
  const DIRECT_URL   = process.env['DIRECT_URL']!

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  const prisma   = new PrismaClient({ datasources: { db: { url: DIRECT_URL } } })

  async function createSupabaseUser(email: string, password: string): Promise<string> {
    const { data, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true })
    if (!error) return data.user.id
    if (error.message.toLowerCase().includes('already registered')) {
      const { data: list } = await supabase.auth.admin.listUsers({ perPage: 2000 })
      const found = list?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase())
      if (found) {
        const existing = await prisma.usuario.findFirst({ where: { supabase_auth_id: found.id } })
        if (!existing) return found.id
      }
      throw new Error(`Ya existe una cuenta de Supabase con ese correo: ${email}`)
    }
    throw new Error(`Supabase: ${error.message} (${email})`)
  }

  const inst = await prisma.institucion.findUnique({ where: { subdominio: 'pioxii' } })
  if (!inst) { console.error('No se encontró la institución "pioxii"'); process.exit(1) }

  console.log(`\n${COMMIT ? 'MODO COMMIT — se va a escribir en la base de datos real' : 'MODO REPORTE (dry-run) — no se escribe nada'}\n`)

  const docentesDB = await prisma.docente.findMany({
    where: { usuario: { institucion_id: inst.id } },
    include: { usuario: true },
  })

  const emailsUsados = new Set(
    (await prisma.usuario.findMany({ where: { institucion_id: inst.id }, select: { email: true } }))
      .map(u => u.email.toLowerCase())
  )

  let actualizados = 0
  let creados = 0
  let sinCambio = 0
  const matcheadosIds = new Set<string>()

  for (const d of DOCENTES) {
    const apellidoNorm = norm(`${d.paterno} ${d.materno}`)
    const nombreNorm   = norm(d.nombres)
    const match = docentesDB.find(doc =>
      norm(doc.usuario.apellido) === apellidoNorm && norm(doc.usuario.nombre) === nombreNorm
    )

    if (match) {
      matcheadosIds.add(match.id)
      if (match.usuario.email.toLowerCase() === d.email.toLowerCase()) {
        sinCambio++
        continue
      }
      console.log(`  [actualizar] ${match.usuario.apellido}, ${match.usuario.nombre} — ${match.usuario.email} → ${d.email}`)
      actualizados++
      if (COMMIT) {
        await supabase.auth.admin.updateUserById(match.usuario.supabase_auth_id, { email: d.email }).catch(e =>
          console.error(`    ! Error actualizando en Supabase Auth: ${e.message}`)
        )
        await prisma.usuario.update({ where: { id: match.usuario_id }, data: { email: d.email } })
      }
    } else {
      const apellido = [d.paterno, d.materno].map(toTitle).join(' ')
      const nombre    = toTitle(d.nombres)
      console.log(`  [crear] ${apellido}, ${nombre} — ${d.email}`)
      creados++
      if (emailsUsados.has(d.email.toLowerCase())) {
        console.log(`    ⚠ el correo ya está en uso por otra cuenta del sistema — revisar a mano, no se crea automáticamente`)
        continue
      }
      if (COMMIT) {
        const authId = await createSupabaseUser(d.email, PWD_DOCENTE)
        await prisma.docente.create({
          data: {
            usuario: {
              create: { supabase_auth_id: authId, email: d.email, nombre, apellido, rol: 'DOCENTE', institucion_id: inst.id },
            },
          },
        })
        emailsUsados.add(d.email.toLowerCase())
      }
    }
  }

  const noEnLaLista = docentesDB.filter(doc => !matcheadosIds.has(doc.id))

  console.log(`\n${'─'.repeat(90)}`)
  console.log(`  Actualizados: ${actualizados}`)
  console.log(`  Creados: ${creados}`)
  console.log(`  Sin cambio: ${sinCambio}`)
  console.log('─'.repeat(90))

  if (noEnLaLista.length > 0) {
    console.log(`\n⚠ Docentes que existen en el sistema pero NO aparecen en la nueva lista (no se tocan):`)
    for (const doc of noEnLaLista) {
      console.log(`  - ${doc.usuario.apellido}, ${doc.usuario.nombre} — ${doc.usuario.email}`)
    }
  }

  if (!COMMIT) {
    console.log('\nNada se escribió — corré con --commit para aplicar de verdad.')
  }

  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
