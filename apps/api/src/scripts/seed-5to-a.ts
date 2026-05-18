/**
 * seed-5to-a.ts — Crear 35 estudiantes de 5to A Secundaria (Colegio Pío XII)
 * Uso: npx tsx src/scripts/seed-5to-a.ts  (desde apps/api)
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { PrismaClient }  from '@prisma/client'

// ─── Datos de los 35 estudiantes ──────────────────────────────────────────────

const ESTUDIANTES = [
  { nombre: 'JESUS',              apellido: 'AGUILAR HUANCA',     email: 'aguilar.huanca.jesus.2025@uepioxii.edu.bo' },
  { nombre: 'DANIEL JHONATAN',    apellido: 'AGUILAR ROMAY',      email: 'aguilar.romay.daniel.2025@uepioxii.edu.bo' },
  { nombre: 'JESICA GIANINA',     apellido: 'ALBARADO ALVARADO',  email: 'jesica.albarado6@uepioxii.edu.bo' },
  { nombre: 'KEYLI ARLIN',        apellido: 'ARNEZ GONZALES',     email: 'arnez.gonzales.keyli.2025@uepioxii.edu.bo' },
  { nombre: 'SHEYLA',             apellido: 'BAUTISTA CORO',      email: 'bautista.coro.sheyla.2025@uepioxii.edu.bo' },
  { nombre: 'LUIS MARCELO',       apellido: 'CABRERA ZUNIGA',     email: 'cabrera.zuniga.luis.2025@uepioxii.edu.bo' },
  { nombre: 'LEANDRO',            apellido: 'CAMACHO SERRUDO',    email: 'camacho.serrudo.leandro.2025@uepioxii.edu.bo' },
  { nombre: 'JHESITH',            apellido: 'CHAMBILLA SARCILLO', email: 'jhesith.chambilla6@uepioxii.edu.bo' },
  { nombre: 'BELEN ESTEFANI',     apellido: 'CHOQUE MAMANI',      email: 'choque.mamani.belen.2025@uepioxii.edu.bo' },
  { nombre: 'ERICK BRYAN',        apellido: 'COAQUIRA COPA',      email: 'coaquira.copa.erick.2025@uepioxii.edu.bo' },
  { nombre: 'YORKA',              apellido: 'CONDE PAQUI',        email: 'conde.paqui.yorka.2025@uepioxii.edu.bo' },
  { nombre: 'PRISCILA',           apellido: 'COPALI BOLIVAR',     email: 'copali.bolivar.priscila.2025@uepioxii.edu.bo' },
  { nombre: 'PAUL SEBASTIAN',     apellido: 'ESPINOZA LAIME',     email: 'espinoza.laime.paul.2025@uepioxii.edu.bo' },
  { nombre: 'MIKEYLA',            apellido: 'FLORES CASILLAS',    email: 'mikeyla.flores6@uepioxii.edu.bo' },
  { nombre: 'VERONICA JHAZMIN',   apellido: 'GUZMAN SALGUERO',    email: 'guzman.salguero.veronica.2025@uepioxii.edu.bo' },
  { nombre: 'JOSUE WALTER',       apellido: 'HERRERA ALACA',      email: 'josue.herrera.alaca.2025@uepioxii.edu.bo' },
  { nombre: 'EDWARD ISAAC',       apellido: 'LARUTA PINTO',       email: 'laruta.pinto.edward.2025@uepioxii.edu.bo' },
  { nombre: 'GENESIS BIANCA',     apellido: 'LIZARAZU MAMANI',    email: 'lizarazu.mamani.genesis.2025@uepioxii.edu.bo' },
  { nombre: 'MAYERLY ALISON',     apellido: 'MAMANI RIOS',        email: 'alison.mamani6@uepioxii.edu.bo' },
  { nombre: 'NICOLAS MATEO',      apellido: 'MEDINA CLAROS',      email: 'medina.claros.nicolas.2025@uepioxii.edu.bo' },
  { nombre: 'JHONATAN GUALBERTO', apellido: 'MERIDA SAUCE',       email: 'merida.sauce.jhonatan.2025@uepioxii.edu.bo' },
  { nombre: 'GHILMAR EDGAR',      apellido: 'ORELLANA OVANDO',    email: 'orellana.ovando.ghilmar.2025@uepioxii.edu.bo' },
  { nombre: 'JESSICA NICOL',      apellido: 'PENALOZA PORCO',     email: 'penaloza.porco.jessica.2025@uepioxii.edu.bo' },
  { nombre: 'AMIRA ROSARIO',      apellido: 'QUISPE APAZA',       email: 'quispe.apaza.amira.2025@uepioxii.edu.bo' },
  { nombre: 'MEREDITH JANA',      apellido: 'REQUE HERRERA',      email: 'reque.herrera.jana.2025@uepioxii.edu.bo' },
  { nombre: 'VALENTINA',          apellido: 'SALGUERO DA SILVA',  email: 'salguero.dasilva.valentina.2025@uepioxii.edu.bo' },
  { nombre: 'DARLYN ORIANA',      apellido: 'SILVESTRE CHOQUE',   email: 'silvestre.choque.darlyn.2025@uepioxii.edu.bo' },
  { nombre: 'NICOLAS GIOVANNI',   apellido: 'SONAGLIA SOLIZ',     email: 'nicolas.sonaglia2025@uepioxii.edu.bo' },
  { nombre: 'DAYRO VICTOR',       apellido: 'SOTO CHOQUE',        email: 'dayro.soto.2025@uepioxii.edu.bo' },
  { nombre: 'SOLANSH SANJANA',    apellido: 'SOTO SAYGUA',        email: 'soto.saygua.solansh.2025@uepioxii.edu.bo' },
  { nombre: 'LINO OSCAR',         apellido: 'VASQUEZ MAQUE',      email: 'vasquez.maque.lino.2025@uepioxii.edu.bo' },
  { nombre: 'JAIRO JHOEL',        apellido: 'VEIZAGA TORANZO',    email: 'veizaga.toranzo.jairo.2025@uepioxii.edu.bo' },
  { nombre: 'JOSE GIOVANI',       apellido: 'VELARDE VARGAS',     email: 'jose.velarde6@uepioxii.edu.bo' },
  { nombre: 'NAIRA MILENKA',      apellido: 'VERDUGUEZ COPA',     email: 'verduguez.copa.naira.2025@uepioxii.edu.bo' },
  { nombre: 'ADRIAN RICARDO',     apellido: 'YUJRA GRANADO',      email: 'yujra.granado.adrian.2025@uepioxii.edu.bo' },
] as const

const PWD = 'Edusync2026'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9.]/g, '.')
    .replace(/\.{2,}/g, '.')
}

function parentEmail(apellido: string, index: number): string {
  const parts   = apellido.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(' ')
  const ap1     = parts[0] ?? 'padre'
  const ap2     = parts[1] ?? ''
  const base    = ap2 ? `padre.${ap1}.${ap2}` : `padre.${ap1}`
  return `${base}.${String(index).padStart(2, '0')}@gmail.com`
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const SUPABASE_URL = process.env['SUPABASE_URL']!
  const SERVICE_KEY  = process.env['SUPABASE_SERVICE_ROLE_KEY']!
  const DIRECT_URL   = process.env['DIRECT_URL']!

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const prisma = new PrismaClient({ datasources: { db: { url: DIRECT_URL } } })

  async function createSupabaseUser(email: string, password: string): Promise<string> {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (!error) return data.user.id
    if (error.message.toLowerCase().includes('already')) {
      const { data: list } = await supabase.auth.admin.listUsers({ perPage: 1000 })
      const found = list?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase())
      if (found) return found.id
    }
    throw new Error(`Supabase: ${error.message} (${email})`)
  }

  // ─── Lookup: institución pioxii ────────────────────────────────────────────

  const inst = await prisma.institucion.findUnique({ where: { subdominio: 'pioxii' } })
  if (!inst) { console.error('No se encontró la institución con subdominio "pioxii"'); process.exit(1) }
  console.log(`\nInstitución: ${inst.nombre} (${inst.id})\n`)

  // ─── Lookup: nivel SECUNDARIA ──────────────────────────────────────────────

  const nivel = await prisma.nivel.findUnique({
    where: { institucion_id_nombre: { institucion_id: inst.id, nombre: 'SECUNDARIA' } },
  })
  if (!nivel) { console.error('No se encontró el nivel SECUNDARIA para pioxii'); process.exit(1) }
  console.log(`Nivel: SECUNDARIA (${nivel.id})\n`)

  // ─── Lookup: gestión activa (para matrícula opcional) ─────────────────────

  const gestion = await prisma.gestion.findFirst({
    where: { institucion_id: inst.id, activa: true },
  })
  console.log(gestion
    ? `Gestión activa: ${gestion.anno} (${gestion.id})\n`
    : 'Sin gestión activa — los estudiantes se crean sin matrícula\n'
  )

  // ─── Lookup: paralelo 5to A (opcional) ────────────────────────────────────

  const paralelo5toA = await prisma.paralelo.findFirst({
    where: {
      letra: 'A',
      grado: {
        nivel_id: nivel.id,
        nombre:   { contains: '5' },
      },
    },
  })
  console.log(paralelo5toA
    ? `Paralelo 5to A encontrado (${paralelo5toA.id}) — se matriculará\n`
    : 'Paralelo 5to A no encontrado — sin matrícula automática\n'
  )

  // ─── Contador de estudiantes existentes ───────────────────────────────────

  let estCount = await prisma.estudiante.count({ where: { usuario: { institucion_id: inst.id } } })

  const LINE = '─'.repeat(90)
  console.log(LINE)
  console.log('  CREANDO ESTUDIANTES + PADRES')
  console.log(LINE)

  for (let i = 0; i < ESTUDIANTES.length; i++) {
    const est  = ESTUDIANTES[i]!
    const idx  = i + 1

    // ── Estudiante ───────────────────────────────────────────────────────────

    let estUserId: string
    const existingEst = await prisma.usuario.findUnique({ where: { email: est.email } })

    if (existingEst) {
      console.log(`  ~  [${String(idx).padStart(2, '0')}] ESTUDIANTE ya existe: ${est.email}`)
      const estRecord = await prisma.estudiante.findUnique({ where: { usuario_id: existingEst.id } })
      estUserId = existingEst.id

      // Matricular si no tiene matrícula en gestión activa
      if (estRecord && paralelo5toA && gestion) {
        const yaMatriculado = await prisma.matricula.findUnique({
          where: { estudiante_id_gestion_id: { estudiante_id: estRecord.id, gestion_id: gestion.id } },
        })
        if (!yaMatriculado) {
          await prisma.matricula.create({
            data: { estudiante_id: estRecord.id, paralelo_id: paralelo5toA.id, gestion_id: gestion.id },
          })
          console.log(`       → matriculado en 5to A`)
        }
      }
    } else {
      const authId = await createSupabaseUser(est.email, PWD)
      estCount++
      const codigo = `5A-2026-${String(estCount).padStart(3, '0')}`

      await prisma.estudiante.create({
        data: {
          codigo,
          becado:          false,
          fecha_nacimiento: null,
          nivel:    { connect: { id: nivel.id } },
          usuario:  {
            create: {
              supabase_auth_id: authId,
              email:            est.email,
              nombre:           est.nombre,
              apellido:         est.apellido,
              rol:              'ESTUDIANTE',
              institucion_id:   inst.id,
            },
          },
          ...(paralelo5toA && gestion ? {
            matriculas: {
              create: { paralelo_id: paralelo5toA.id, gestion_id: gestion.id },
            },
          } : {}),
        },
      })

      estUserId = (await prisma.usuario.findUnique({ where: { email: est.email } }))!.id
      console.log(`  ✓  [${String(idx).padStart(2, '0')}] ESTUDIANTE  ${est.apellido}, ${est.nombre}`)
      console.log(`       email: ${est.email}  pwd: ${PWD}  código: ${codigo}`)
    }

    // ── Padre ────────────────────────────────────────────────────────────────

    const padreEmail = parentEmail(est.apellido, idx)
    const apellido1  = est.apellido.split(' ')[0] ?? est.apellido

    let padreId: string
    const existingPadre = await prisma.usuario.findUnique({ where: { email: padreEmail } })

    if (existingPadre) {
      console.log(`       PADRE ya existe: ${padreEmail}`)
      padreId = existingPadre.id
    } else {
      const authIdPadre = await createSupabaseUser(padreEmail, PWD)
      const padre = await prisma.usuario.create({
        data: {
          supabase_auth_id: authIdPadre,
          email:            padreEmail,
          nombre:           'Padre/Madre',
          apellido:         `de ${apellido1}`,
          rol:              'PADRE_TUTOR',
          institucion_id:   inst.id,
        },
      })
      padreId = padre.id
      console.log(`       PADRE       email: ${padreEmail}  pwd: ${PWD}`)
    }

    // ── Relación padre → estudiante ──────────────────────────────────────────

    const estRecord = await prisma.estudiante.findUnique({ where: { usuario_id: estUserId } })
    if (estRecord) {
      await prisma.relacionPadreHijo.upsert({
        where:  { padre_id_estudiante_id: { padre_id: padreId, estudiante_id: estRecord.id } },
        create: { padre_id: padreId, estudiante_id: estRecord.id },
        update: {},
      })
    }

    console.log()
  }

  // ─── Resumen ───────────────────────────────────────────────────────────────

  const total = await prisma.estudiante.count({ where: { usuario: { institucion_id: inst.id } } })
  console.log(LINE)
  console.log(`  Proceso completado. Total de estudiantes en pioxii: ${total}`)
  console.log(`  Contraseña de todas las cuentas nuevas: ${PWD}`)
  console.log(LINE + '\n')

  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
