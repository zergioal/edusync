import { PrismaClient, Rol, NivelNombre } from '@prisma/client'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Load Supabase env vars from API's .env
try {
  const envContent = readFileSync(resolve(__dirname, '../../apps/api/.env'), 'utf-8')
  for (const line of envContent.split('\n')) {
    const match = line.match(/^([A-Z_][A-Z0-9_]*)="?([^"\n]*)"?\s*$/)
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2]
  }
} catch { /* env file not found, rely on process.env */ }

const prisma = new PrismaClient()

const SUPABASE_URL       = process.env['SUPABASE_URL'] ?? ''
const SERVICE_ROLE_KEY   = process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? ''

// ─── Supabase Auth helpers ────────────────────────────────────────────────────

async function getOrCreateSupabaseUser(email: string, password: string): Promise<string> {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.warn(`⚠️  Sin credenciales Supabase — usando ID fake para ${email}`)
    return `seed-${email.split('@')[0]}-auth-id`
  }

  // Try to create
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
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
    // List users to find the existing one
    const listRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=1000`, {
      headers: { 'apikey': SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SERVICE_ROLE_KEY}` },
    })
    const listData = await listRes.json() as { users?: { id: string; email: string }[] }
    const found = listData.users?.find(u => u.email === email)
    if (found) return found.id
  }

  throw new Error(`Error creando usuario Supabase ${email}: ${JSON.stringify(err)}`)
}

// ─── Datos del currículo boliviano (Ley 070) ─────────────────────────────────

const DIMENSIONES = [
  { nombre: 'SER_DECIDIR',    puntaje_max: 10, orden: 1 },
  { nombre: 'SABER',          puntaje_max: 45, orden: 2 },
  { nombre: 'HACER',          puntaje_max: 40, orden: 3 },
  { nombre: 'AUTOEVALUACION', puntaje_max: 5,  orden: 4 },
]

const GRADOS_POR_NIVEL: Record<NivelNombre, { nombre: string; orden: number }[]> = {
  INICIAL: [
    { nombre: 'Primer año de Escolaridad',   orden: 1 },
    { nombre: 'Segundo año de Escolaridad',  orden: 2 },
  ],
  PRIMARIA: [
    { nombre: '1° de Primaria', orden: 1 },
    { nombre: '2° de Primaria', orden: 2 },
    { nombre: '3° de Primaria', orden: 3 },
    { nombre: '4° de Primaria', orden: 4 },
    { nombre: '5° de Primaria', orden: 5 },
    { nombre: '6° de Primaria', orden: 6 },
  ],
  SECUNDARIA: [
    { nombre: '1° de Secundaria', orden: 1 },
    { nombre: '2° de Secundaria', orden: 2 },
    { nombre: '3° de Secundaria', orden: 3 },
    { nombre: '4° de Secundaria', orden: 4 },
    { nombre: '5° de Secundaria', orden: 5 },
    { nombre: '6° de Secundaria', orden: 6 },
  ],
}

const CURRICULO: Record<NivelNombre, { campo: string; materias: string[] }[]> = {
  INICIAL: [
    { campo: 'Cosmos y Pensamiento',        materias: ['Cosmovisiones, Filosofía y Psicología'] },
    { campo: 'Comunidad y Sociedad',        materias: ['Comunicación y Lenguajes (Lengua Castellana)', 'Comunicación y Lenguajes (Lengua Originaria)', 'Ciencias Sociales', 'Educación Física, Deportes y Recreación', 'Educación Musical', 'Artes Plásticas y Visuales'] },
    { campo: 'Vida Tierra y Territorio',    materias: ['Ciencias Naturales'] },
    { campo: 'Ciencia Tecnología y Producción', materias: ['Matemática'] },
  ],
  PRIMARIA: [
    { campo: 'Cosmos y Pensamiento',        materias: ['Cosmovisiones, Filosofía y Psicología', 'Valores, Espiritualidad y Religiones'] },
    { campo: 'Comunidad y Sociedad',        materias: ['Comunicación y Lenguajes (Lengua Castellana)', 'Comunicación y Lenguajes (Lengua Originaria)', 'Comunicación y Lenguajes (Lengua Extranjera)', 'Ciencias Sociales', 'Educación Física, Deportes y Recreación', 'Educación Musical', 'Artes Plásticas y Visuales'] },
    { campo: 'Vida Tierra y Territorio',    materias: ['Ciencias Naturales', 'Técnica Tecnológica General'] },
    { campo: 'Ciencia Tecnología y Producción', materias: ['Matemática', 'Técnica Tecnológica Específica'] },
  ],
  SECUNDARIA: [
    { campo: 'Cosmos y Pensamiento',        materias: ['Cosmovisiones, Filosofía y Psicología', 'Valores, Espiritualidad y Religiones'] },
    { campo: 'Comunidad y Sociedad',        materias: ['Comunicación y Lenguajes (Lengua Castellana)', 'Comunicación y Lenguajes (Lengua Originaria)', 'Comunicación y Lenguajes (Lengua Extranjera)', 'Ciencias Sociales', 'Educación Física, Deportes y Recreación', 'Educación Musical', 'Artes Plásticas y Visuales'] },
    { campo: 'Vida Tierra y Territorio',    materias: ['Biología - Geografía', 'Física', 'Química'] },
    { campo: 'Ciencia Tecnología y Producción', materias: ['Matemática', 'Técnica Tecnológica', 'Emprendimientos'] },
  ],
}

const PASSWORD = 'EduSync2026#'

// ─── Seed ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Iniciando seed de EduSync...')

  // 1. Institución
  const institucion = await prisma.institucion.upsert({
    where: { subdominio: 'pioxii' },
    create: { nombre: 'U.E. Privada Pío XII', subdominio: 'pioxii', activa: true },
    update: {},
  })
  console.log(`✅ Institución: ${institucion.nombre}`)

  // 2. Dimensiones
  for (const dim of DIMENSIONES) {
    const existing = await prisma.dimension.findFirst({ where: { institucion_id: institucion.id, nombre: dim.nombre } })
    await prisma.dimension.upsert({
      where: { id: existing?.id ?? '00000000-0000-0000-0000-000000000000' },
      create: { ...dim, institucion_id: institucion.id },
      update: {},
    })
  }
  console.log('✅ Dimensiones creadas')

  // 3. Niveles, grados, campos y materias
  const nivelMap: Record<NivelNombre, string> = {} as Record<NivelNombre, string>
  for (const nivelNombre of [NivelNombre.INICIAL, NivelNombre.PRIMARIA, NivelNombre.SECUNDARIA]) {
    const nivel = await prisma.nivel.upsert({
      where: { institucion_id_nombre: { institucion_id: institucion.id, nombre: nivelNombre } },
      create: { nombre: nivelNombre, institucion_id: institucion.id },
      update: {},
    })
    nivelMap[nivelNombre] = nivel.id

    for (const grado of GRADOS_POR_NIVEL[nivelNombre]) {
      const eg = await prisma.grado.findFirst({ where: { nivel_id: nivel.id, nombre: grado.nombre } })
      await prisma.grado.upsert({
        where: { id: eg?.id ?? '00000000-0000-0000-0000-000000000000' },
        create: { ...grado, nivel_id: nivel.id },
        update: {},
      })
    }

    for (const campoData of CURRICULO[nivelNombre]) {
      const ec = await prisma.campo.findFirst({ where: { institucion_id: institucion.id, nivel_id: nivel.id, nombre: campoData.campo } })
      const campo = await prisma.campo.upsert({
        where: { id: ec?.id ?? '00000000-0000-0000-0000-000000000000' },
        create: { nombre: campoData.campo, institucion_id: institucion.id, nivel_id: nivel.id },
        update: {},
      })
      for (const materiaNombre of campoData.materias) {
        const em = await prisma.materia.findFirst({ where: { campo_id: campo.id, nivel_id: nivel.id, nombre: materiaNombre } })
        await prisma.materia.upsert({
          where: { id: em?.id ?? '00000000-0000-0000-0000-000000000000' },
          create: { nombre: materiaNombre, campo_id: campo.id, nivel_id: nivel.id, activa: true },
          update: {},
        })
      }
    }
    console.log(`✅ Nivel ${nivelNombre}: estructuras creadas`)
  }

  // 4. Gestión 2026 + trimestres
  const gestion = await prisma.gestion.upsert({
    where: { institucion_id_anno: { institucion_id: institucion.id, anno: 2026 } },
    create: { institucion_id: institucion.id, anno: 2026, activa: true },
    update: { activa: true },
  })
  const trimestresData = [
    { numero: 1, fecha_inicio: new Date('2026-02-03'), fecha_fin: new Date('2026-05-30') },
    { numero: 2, fecha_inicio: new Date('2026-06-09'), fecha_fin: new Date('2026-09-12') },
    { numero: 3, fecha_inicio: new Date('2026-09-22'), fecha_fin: new Date('2026-11-28') },
  ]
  const trimestres: { numero: number; id: string }[] = []
  for (const t of trimestresData) {
    const trimestre = await prisma.trimestre.upsert({
      where: { gestion_id_numero: { gestion_id: gestion.id, numero: t.numero } },
      create: { ...t, gestion_id: gestion.id, cerrado: false },
      update: {},
    })
    trimestres.push({ numero: t.numero, id: trimestre.id })
  }
  console.log('✅ Gestión 2026 y trimestres creados')

  // 5. Usuarios de prueba (staff)
  const staffUsers = [
    { email: 'admin@pioxii.edu.bo',        rol: Rol.ADMIN_SISTEMA, nombre: 'Administrador',  apellido: 'Sistema'         },
    { email: 'director@pioxii.edu.bo',     rol: Rol.DIRECTOR,      nombre: 'Juan Carlos',    apellido: 'Mamani Quispe'   },
    { email: 'coordinador@pioxii.edu.bo',  rol: Rol.COORDINADOR,   nombre: 'María',          apellido: 'Flores Condori'  },
    { email: 'secretaria@pioxii.edu.bo',   rol: Rol.SECRETARIA,    nombre: 'Carmen',         apellido: 'Vargas Huanca'   },
    { email: 'regente@pioxii.edu.bo',      rol: Rol.REGENTE,       nombre: 'Eduardo',        apellido: 'Quispe Torres'   },
    { email: 'contador@pioxii.edu.bo',     rol: Rol.CONTADOR,      nombre: 'Rosa',           apellido: 'Condori Mamani'  },
    { email: 'padre@pioxii.edu.bo',        rol: Rol.PADRE_TUTOR,   nombre: 'Roberto',        apellido: 'Chura López'     },
  ]

  for (const u of staffUsers) {
    const authId = await getOrCreateSupabaseUser(u.email, PASSWORD)
    await prisma.usuario.upsert({
      where: { email: u.email },
      create: { institucion_id: institucion.id, supabase_auth_id: authId, email: u.email, rol: u.rol, nombre: u.nombre, apellido: u.apellido, activo: true },
      update: { supabase_auth_id: authId },
    })
  }

  // Docente principal + registro docente
  const docenteAuthId = await getOrCreateSupabaseUser('docente@pioxii.edu.bo', PASSWORD)
  const usuarioDocente = await prisma.usuario.upsert({
    where: { email: 'docente@pioxii.edu.bo' },
    create: { institucion_id: institucion.id, supabase_auth_id: docenteAuthId, email: 'docente@pioxii.edu.bo', rol: Rol.DOCENTE, nombre: 'Pedro', apellido: 'Quispe Mamani', activo: true },
    update: { supabase_auth_id: docenteAuthId },
  })
  await prisma.docente.upsert({ where: { usuario_id: usuarioDocente.id }, create: { usuario_id: usuarioDocente.id }, update: {} })

  // Docente 2
  const docente2AuthId = await getOrCreateSupabaseUser('docente2@pioxii.edu.bo', PASSWORD)
  const usuarioDocente2 = await prisma.usuario.upsert({
    where: { email: 'docente2@pioxii.edu.bo' },
    create: { institucion_id: institucion.id, supabase_auth_id: docente2AuthId, email: 'docente2@pioxii.edu.bo', rol: Rol.DOCENTE, nombre: 'Ana',  apellido: 'Condori Huanca', activo: true },
    update: { supabase_auth_id: docente2AuthId },
  })
  await prisma.docente.upsert({ where: { usuario_id: usuarioDocente2.id }, create: { usuario_id: usuarioDocente2.id }, update: {} })

  console.log('✅ Usuarios staff y docentes creados')

  // 6. Paralelo 2° de Secundaria "A" para estudiantes de prueba
  const nivelSecId = nivelMap[NivelNombre.SECUNDARIA]!
  const grado2Sec = await prisma.grado.findFirst({ where: { nivel_id: nivelSecId, nombre: '2° de Secundaria' } })
  if (!grado2Sec) throw new Error('Grado 2° de Secundaria no encontrado')

  const paralelo2A = await prisma.paralelo.upsert({
    where: { id: (await prisma.paralelo.findFirst({ where: { grado_id: grado2Sec.id, letra: 'A' } }))?.id ?? '00000000-0000-0000-0000-000000000000' },
    create: { grado_id: grado2Sec.id, letra: 'A', activo: true },
    update: {},
  })
  console.log('✅ Paralelo 2° Secundaria "A" listo')

  // 7. Estudiantes + matrícula en 2do A
  const estudiantesData = [
    { email: 'estudiante1@pioxii.edu.bo', nombre: 'Pedro',    apellido: 'García Mamani'   },
    { email: 'estudiante2@pioxii.edu.bo', nombre: 'María',    apellido: 'Flores Quispe'   },
    { email: 'estudiante3@pioxii.edu.bo', nombre: 'Juan',     apellido: 'Condori López'   },
    { email: 'estudiante4@pioxii.edu.bo', nombre: 'Ana',      apellido: 'Mamani Torres'   },
    { email: 'estudiante5@pioxii.edu.bo', nombre: 'Luis',     apellido: 'Quispe Vargas'   },
  ]

  const estudiantesCreados: { id: string; email: string }[] = []
  let codigoBase = await prisma.estudiante.count({ where: { usuario: { institucion_id: institucion.id } } })

  for (const est of estudiantesData) {
    const authId = await getOrCreateSupabaseUser(est.email, PASSWORD)
    const usuarioEst = await prisma.usuario.upsert({
      where: { email: est.email },
      create: { institucion_id: institucion.id, supabase_auth_id: authId, email: est.email, rol: Rol.ESTUDIANTE, nombre: est.nombre, apellido: est.apellido, activo: true },
      update: { supabase_auth_id: authId },
    })

    codigoBase++
    const codigo = `EST-2026-${String(codigoBase).padStart(3, '0')}`

    const estudiante = await prisma.estudiante.upsert({
      where: { usuario_id: usuarioEst.id },
      create: { usuario_id: usuarioEst.id, codigo, nivel_id: nivelSecId },
      update: {},
    })

    await prisma.matricula.upsert({
      where: { estudiante_id_gestion_id: { estudiante_id: estudiante.id, gestion_id: gestion.id } },
      create: { estudiante_id: estudiante.id, paralelo_id: paralelo2A.id, gestion_id: gestion.id },
      update: {},
    })

    estudiantesCreados.push({ id: estudiante.id, email: est.email })
  }
  console.log('✅ 5 estudiantes creados y matriculados en 2° Secundaria "A"')

  // 7b. Marcar estudiante3 como becado
  const estJuan = estudiantesCreados[2]
  if (estJuan) {
    await prisma.estudiante.update({
      where: { id: estJuan.id },
      data:  { becado: true, motivo_beca: 'Beca por rendimiento académico' },
    })
    console.log('✅ Estudiante3 (Juan Condori López) marcado como becado')
  }

  // 7c. Tarifas de pensión para gestión 2026
  const TARIFAS: Record<NivelNombre, number> = {
    INICIAL:    350,
    PRIMARIA:   280,
    SECUNDARIA: 320,
  }
  for (const [nivelNombre, monto] of Object.entries(TARIFAS) as [NivelNombre, number][]) {
    const nivel_id = nivelMap[nivelNombre]!
    await prisma.tarifaPension.upsert({
      where:  { gestion_id_nivel_id: { gestion_id: gestion.id, nivel_id } },
      create: { institucion_id: institucion.id, gestion_id: gestion.id, nivel_id, monto },
      update: { monto },
    })
  }
  console.log('✅ Tarifas de pensión 2026 creadas (Inicial: 350, Primaria: 280, Secundaria: 320)')

  // 8. Padres + relación padre-hijo
  const padresData = [
    { email: 'padre1@pioxii.edu.bo', nombre: 'Carlos',   apellido: 'García Torres',  hijos: [0, 1] },
    { email: 'padre2@pioxii.edu.bo', nombre: 'Lucía',    apellido: 'Condori Flores', hijos: [2, 3] },
  ]

  for (const p of padresData) {
    const authId = await getOrCreateSupabaseUser(p.email, PASSWORD)
    const usuarioPadre = await prisma.usuario.upsert({
      where: { email: p.email },
      create: { institucion_id: institucion.id, supabase_auth_id: authId, email: p.email, rol: Rol.PADRE_TUTOR, nombre: p.nombre, apellido: p.apellido, activo: true },
      update: { supabase_auth_id: authId },
    })

    for (const hijoIdx of p.hijos) {
      const estudianteId = estudiantesCreados[hijoIdx]!.id
      await prisma.relacionPadreHijo.upsert({
        where: { padre_id_estudiante_id: { padre_id: usuarioPadre.id, estudiante_id: estudianteId } },
        create: { padre_id: usuarioPadre.id, estudiante_id: estudianteId },
        update: {},
      })
    }
  }
  console.log('✅ 2 padres creados y vinculados a estudiantes')

  console.log('\n🎉 Seed completado exitosamente!')
  console.log(`📧 Password para todos: ${PASSWORD}`)
}

main()
  .catch((e) => { console.error('❌ Error en seed:', e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
