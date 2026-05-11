/**
 * seed-curriculo.ts
 * Corrección completa del currículo boliviano Ley 070 + turnos + config horario
 * Uso: npx tsx src/scripts/seed-curriculo.ts  (desde apps/api)
 */

import 'dotenv/config'
import { PrismaClient, NivelNombre } from '@prisma/client'

async function main() {
  const prisma = new PrismaClient({ datasources: { db: { url: process.env['DIRECT_URL'] } } })

  const inst = await prisma.institucion.findFirst()
  if (!inst) { console.error('No hay institución.'); process.exit(1) }

  // ─── 1. tipo_ue = BTH + ConfigHorario ─────────────────────────────────────

  await prisma.institucion.update({
    where: { id: inst.id },
    data:  { tipo_ue: 'BTH' },
  })
  console.log('✓ Institución actualizada → tipo_ue: BTH')

  await prisma.configHorario.upsert({
    where:  { institucion_id: inst.id },
    create: { institucion_id: inst.id, duracion_periodo_min: 40 },
    update: { duracion_periodo_min: 40 },
  })
  console.log('✓ ConfigHorario: 40 min/período')

  // ─── 2. Turnos ─────────────────────────────────────────────────────────────

  const turnoManana = await prisma.turno.upsert({
    where:  { institucion_id_tipo: { institucion_id: inst.id, tipo: 'MANANA' } },
    create: { institucion_id: inst.id, nombre: 'Mañana', tipo: 'MANANA', activo: true },
    update: { nombre: 'Mañana', activo: true },
  })

  await prisma.turno.upsert({
    where:  { institucion_id_tipo: { institucion_id: inst.id, tipo: 'TARDE' } },
    create: { institucion_id: inst.id, nombre: 'Tarde', tipo: 'TARDE', activo: false },
    update: {},
  })

  await prisma.turno.upsert({
    where:  { institucion_id_tipo: { institucion_id: inst.id, tipo: 'NOCHE' } },
    create: { institucion_id: inst.id, nombre: 'Noche', tipo: 'NOCHE', activo: false },
    update: {},
  })
  console.log('✓ Turnos creados (Mañana activo, Tarde/Noche inactivos)')

  // ─── 3. HorarioNivelTurno + RecreoPeriodo ──────────────────────────────────

  const nivelConfigs: { nombre: NivelNombre; hora_inicio: string; minutos_lectura: number; max_periodos: number; recreo_despues: number }[] = [
    { nombre: NivelNombre.INICIAL,     hora_inicio: '07:30', minutos_lectura: 10, max_periodos: 5, recreo_despues: 2 },
    { nombre: NivelNombre.PRIMARIA,    hora_inicio: '07:30', minutos_lectura: 10, max_periodos: 6, recreo_despues: 4 },
    { nombre: NivelNombre.SECUNDARIA,  hora_inicio: '07:30', minutos_lectura: 10, max_periodos: 8, recreo_despues: 4 },
  ]

  for (const cfg of nivelConfigs) {
    const nivel = await prisma.nivel.findFirst({ where: { institucion_id: inst.id, nombre: cfg.nombre } })
    if (!nivel) continue

    const hnt = await prisma.horarioNivelTurno.upsert({
      where:  { turno_id_nivel_id: { turno_id: turnoManana.id, nivel_id: nivel.id } },
      create: {
        turno_id:        turnoManana.id,
        nivel_id:        nivel.id,
        hora_inicio:     cfg.hora_inicio,
        minutos_lectura: cfg.minutos_lectura,
        max_periodos_dia: cfg.max_periodos,
      },
      update: {
        hora_inicio:      cfg.hora_inicio,
        minutos_lectura:  cfg.minutos_lectura,
        max_periodos_dia: cfg.max_periodos,
      },
    })

    // Eliminar recreos anteriores y recrear
    await prisma.recreoPeriodo.deleteMany({ where: { horario_nivel_turno_id: hnt.id } })
    await prisma.recreoPeriodo.create({
      data: { horario_nivel_turno_id: hnt.id, despues_de_periodo: cfg.recreo_despues, duracion_min: 20 },
    })

    console.log(`  ✓ HorarioNivelTurno Mañana/${cfg.nombre}: inicio ${cfg.hora_inicio}, ${cfg.max_periodos} períodos, recreo después del ${cfg.recreo_despues}°`)
  }

  // ─── 4. Curriculo boliviano completo ──────────────────────────────────────

  // Cargar grados por nivel para luego asignar horas
  const gradosDB: Record<NivelNombre, { id: string; orden: number; nombre: string }[]> = {
    INICIAL:    [],
    PRIMARIA:   [],
    SECUNDARIA: [],
  }
  for (const nivelNombre of [NivelNombre.INICIAL, NivelNombre.PRIMARIA, NivelNombre.SECUNDARIA]) {
    const nivel = await prisma.nivel.findFirst({ where: { institucion_id: inst.id, nombre: nivelNombre } })
    if (!nivel) continue
    gradosDB[nivelNombre] = await prisma.grado.findMany({
      where:   { nivel_id: nivel.id },
      orderBy: { orden: 'asc' },
    })
  }

  // Helper: upsert campo
  async function upsertCampo(nivelNombre: NivelNombre, nombreCampo: string) {
    const nivel = await prisma.nivel.findFirst({ where: { institucion_id: inst.id, nombre: nivelNombre } })
    if (!nivel) throw new Error(`Nivel ${nivelNombre} no encontrado`)
    const existing = await prisma.campo.findFirst({ where: { institucion_id: inst.id, nivel_id: nivel.id, nombre: nombreCampo } })
    return prisma.campo.upsert({
      where:  { id: existing?.id ?? '00000000-0000-0000-0000-000000000000' },
      create: { nombre: nombreCampo, institucion_id: inst.id, nivel_id: nivel.id },
      update: {},
    })
  }

  // Helper: upsert materia
  async function upsertMateria(
    nivelNombre: NivelNombre,
    campo_id: string,
    nombre: string,
    opts: {
      aplica_solo_desde_grado?: number
      aplica_hasta_grado?: number
      solo_si_bth?: boolean
      es_holistica?: boolean
    } = {}
  ) {
    const nivel = await prisma.nivel.findFirst({ where: { institucion_id: inst.id, nombre: nivelNombre } })
    if (!nivel) throw new Error(`Nivel ${nivelNombre} no encontrado`)
    const existing = await prisma.materia.findFirst({ where: { nivel_id: nivel.id, nombre } })
    return prisma.materia.upsert({
      where:  { id: existing?.id ?? '00000000-0000-0000-0000-000000000000' },
      create: {
        nombre, campo_id, nivel_id: nivel.id, activa: true,
        aplica_solo_desde_grado: opts.aplica_solo_desde_grado ?? null,
        aplica_hasta_grado:      opts.aplica_hasta_grado      ?? null,
        solo_si_bth:             opts.solo_si_bth             ?? false,
        es_holistica:            opts.es_holistica            ?? false,
      },
      update: {
        campo_id, activa: true,
        aplica_solo_desde_grado: opts.aplica_solo_desde_grado ?? null,
        aplica_hasta_grado:      opts.aplica_hasta_grado      ?? null,
        solo_si_bth:             opts.solo_si_bth             ?? false,
        es_holistica:            opts.es_holistica            ?? false,
      },
    })
  }

  // Helper: upsert carga horaria por grado
  async function setCarga(materia_id: string, grado_id: string, horas_mes: number) {
    await prisma.cargaHorariaMateria.upsert({
      where:  { materia_id_grado_id: { materia_id, grado_id } },
      create: { materia_id, grado_id, horas_mes },
      update: { horas_mes },
    })
  }

  // ── INICIAL ────────────────────────────────────────────────────────────────
  console.log('\n→ INICIAL')
  {
    const campo = await upsertCampo(NivelNombre.INICIAL, 'Área Holística')
    const mat   = await upsertMateria(NivelNombre.INICIAL, campo.id, 'Clases', { es_holistica: true })
    for (const g of gradosDB[NivelNombre.INICIAL]) {
      await setCarga(mat.id, g.id, 100)
    }
    console.log('  ✓ Clases (holística): 100 h/mes × 2 grados')

    // Desactivar otras materias del nivel Inicial
    const nivel = await prisma.nivel.findFirst({ where: { institucion_id: inst.id, nombre: NivelNombre.INICIAL } })
    if (nivel) {
      await prisma.materia.updateMany({
        where: { nivel_id: nivel.id, NOT: { id: mat.id } },
        data:  { activa: false },
      })
    }
  }

  // ── PRIMARIA ───────────────────────────────────────────────────────────────
  console.log('\n→ PRIMARIA')
  {
    type PrimSpec = { nombre: string; campo: string; horas12: number; horas3_6: number }
    const primSpec: PrimSpec[] = [
      { nombre: 'Ciencias Naturales',                                                             campo: 'Vida, Tierra y Territorio',      horas12: 8,  horas3_6: 8  },
      { nombre: 'Comunicación y Lenguajes: Lengua Castellana, Originaria y Extranjera',           campo: 'Comunidad y Sociedad',           horas12: 44, horas3_6: 36 },
      { nombre: 'Ciencias Sociales',                                                              campo: 'Comunidad y Sociedad',           horas12: 8,  horas3_6: 8  },
      { nombre: 'Artes Plásticas y Visuales',                                                     campo: 'Comunidad y Sociedad',           horas12: 8,  horas3_6: 8  },
      { nombre: 'Educación Física y Deportes',                                                    campo: 'Comunidad y Sociedad',           horas12: 8,  horas3_6: 8  },
      { nombre: 'Educación Musical',                                                              campo: 'Comunidad y Sociedad',           horas12: 8,  horas3_6: 8  },
      { nombre: 'Matemática',                                                                     campo: 'Ciencia, Tecnología y Producción', horas12: 20, horas3_6: 28 },
      { nombre: 'Técnica Tecnológica',                                                            campo: 'Ciencia, Tecnología y Producción', horas12: 8,  horas3_6: 8  },
      { nombre: 'Valores, Espiritualidades y Religiones',                                         campo: 'Cosmos y Pensamiento',           horas12: 8,  horas3_6: 8  },
    ]

    const nuevosIds = new Set<string>()
    for (const spec of primSpec) {
      const campo = await upsertCampo(NivelNombre.PRIMARIA, spec.campo)
      const mat   = await upsertMateria(NivelNombre.PRIMARIA, campo.id, spec.nombre)
      nuevosIds.add(mat.id)
      for (const g of gradosDB[NivelNombre.PRIMARIA]) {
        const horas = g.orden <= 2 ? spec.horas12 : spec.horas3_6
        await setCarga(mat.id, g.id, horas)
      }
      console.log(`  ✓ ${spec.nombre} (1°-2°: ${spec.horas12}h, 3°-6°: ${spec.horas3_6}h)`)
    }

    // Desactivar materias antiguas del nivel
    const nivel = await prisma.nivel.findFirst({ where: { institucion_id: inst.id, nombre: NivelNombre.PRIMARIA } })
    if (nivel) {
      await prisma.materia.updateMany({
        where: { nivel_id: nivel.id, NOT: { id: { in: [...nuevosIds] } } },
        data:  { activa: false },
      })
    }
  }

  // ── SECUNDARIA ─────────────────────────────────────────────────────────────
  console.log('\n→ SECUNDARIA')
  {
    type SecSpec = {
      nombre:   string
      campo:    string
      aplica_desde?: number
      aplica_hasta?: number
      solo_bth?: boolean
      horas: number | Record<number, number>  // uniform o por orden de grado
    }

    const secSpec: SecSpec[] = [
      {
        nombre: 'Ciencias Naturales: Biología-Geografía',
        campo:  'Vida, Tierra y Territorio',
        horas:  16,
      },
      {
        nombre: 'Ciencias Naturales: Física',
        campo:  'Vida, Tierra y Territorio',
        aplica_desde: 3,
        horas:  8,
      },
      {
        nombre: 'Ciencias Naturales: Química',
        campo:  'Vida, Tierra y Territorio',
        aplica_desde: 3,
        horas:  8,
      },
      {
        nombre: 'Comunicación y Lenguajes: Lengua Castellana y Originaria',
        campo:  'Comunidad y Sociedad',
        horas:  { 1: 24, 2: 24, 3: 24, 4: 16, 5: 12, 6: 12 },
      },
      {
        nombre: 'Lengua Extranjera',
        campo:  'Comunidad y Sociedad',
        horas:  8,
      },
      {
        nombre: 'Ciencias Sociales',
        campo:  'Comunidad y Sociedad',
        horas:  { 1: 12, 2: 12, 3: 20, 4: 20, 5: 32, 6: 32 },
      },
      {
        nombre: 'Educación Física y Deportes',
        campo:  'Comunidad y Sociedad',
        horas:  8,
      },
      {
        nombre: 'Educación Musical',
        campo:  'Comunidad y Sociedad',
        horas:  8,
      },
      {
        nombre: 'Artes Plásticas y Visuales',
        campo:  'Comunidad y Sociedad',
        horas:  8,
      },
      {
        nombre: 'Cosmovisiones, Filosofía y Psicología',
        campo:  'Cosmos y Pensamiento',
        horas:  8,
      },
      {
        nombre: 'Valores, Espiritualidades y Religiones',
        campo:  'Cosmos y Pensamiento',
        horas:  8,
      },
      {
        nombre: 'Matemática',
        campo:  'Ciencia, Tecnología y Producción',
        horas:  8,
      },
      {
        nombre:      'Técnica Tecnológica General',
        campo:       'Ciencia, Tecnología y Producción',
        aplica_desde: 1,
        aplica_hasta: 4,
        solo_bth:    true,
        horas:       { 1: 16, 2: 16, 3: 32, 4: 32 },
      },
      {
        nombre:      'Técnica Tecnológica Especializada',
        campo:       'Ciencia, Tecnología y Producción',
        aplica_desde: 5,
        solo_bth:    true,
        horas:       { 5: 48, 6: 48 },
      },
    ]

    const nuevosIds = new Set<string>()
    for (const spec of secSpec) {
      const campo = await upsertCampo(NivelNombre.SECUNDARIA, spec.campo)
      const mat   = await upsertMateria(NivelNombre.SECUNDARIA, campo.id, spec.nombre, {
        aplica_solo_desde_grado: spec.aplica_desde,
        aplica_hasta_grado:      spec.aplica_hasta,
        solo_si_bth:             spec.solo_bth,
      })
      nuevosIds.add(mat.id)

      const horasObj = typeof spec.horas === 'number'
        ? Object.fromEntries(gradosDB[NivelNombre.SECUNDARIA].map(g => [g.orden, spec.horas as number]))
        : spec.horas

      for (const g of gradosDB[NivelNombre.SECUNDARIA]) {
        const desde  = spec.aplica_desde ?? 1
        const hasta  = spec.aplica_hasta ?? 6
        if (g.orden < desde || g.orden > hasta) continue
        const h = (horasObj as Record<number, number>)[g.orden]
        if (h !== undefined) await setCarga(mat.id, g.id, h)
      }

      const flag = [spec.solo_bth && '(BTH)', spec.aplica_desde && `desde ${spec.aplica_desde}°`].filter(Boolean).join(' ')
      console.log(`  ✓ ${spec.nombre} ${flag}`)
    }

    // Desactivar materias antiguas
    const nivel = await prisma.nivel.findFirst({ where: { institucion_id: inst.id, nombre: NivelNombre.SECUNDARIA } })
    if (nivel) {
      await prisma.materia.updateMany({
        where: { nivel_id: nivel.id, NOT: { id: { in: [...nuevosIds] } } },
        data:  { activa: false },
      })
    }
  }

  console.log('\n🎉 Currículo boliviano aplicado correctamente.\n')
  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
