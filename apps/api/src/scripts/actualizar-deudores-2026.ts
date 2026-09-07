/**
 * actualizar-deudores-2026.ts — Reconcilia el estado real de las pensiones (Feb-Ago
 * 2026) contra el "Reporte de facturas devengadas pendientes de cobro" real de la
 * institución (DEUDORES A LA FECHA.pdf, corte 04/09/2026). Todo estudiante que NO
 * aparece en la lista de deudores de un mes se marca pagado ese mes; los que sí
 * aparecen quedan pendientes (lo que dispara el bloqueo académico si ya venció).
 *
 * Por defecto corre en modo REPORTE (no escribe nada). Para escribir de verdad:
 *   npx tsx src/scripts/actualizar-deudores-2026.ts --commit   (desde apps/api)
 */

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const COMMIT = process.argv.includes('--commit')

// Meses cubiertos por el reporte (Febrero=2 .. Agosto=8) — el reporte va del
// 01/01/2026 al 04/09/2026 y no registra ninguna deuda de Feb/Mar para nadie,
// así que esos dos meses quedan pagado=true para todos salvo que el reporte
// diga lo contrario (no lo hace).
const MESES_A_RECONCILIAR = [2, 3, 4, 5, 6, 7, 8]

interface DeudorRaw {
  paterno: string; materno: string; nombres: string
  nivel: 'PRIMARIA' | 'SECUNDARIA'
  gradoOrden: number; letra: string
  meses: number[]
}

// ─── Deudores transcritos de "DEUDORES A LA FECHA.pdf" ────────────────────────
const DEUDORES: DeudorRaw[] = [
  // Pri 1° A
  { paterno: 'Arancibia', materno: 'Orellana', nombres: 'Priyanka Lenncy', nivel: 'PRIMARIA', gradoOrden: 1, letra: 'A', meses: [8] },
  { paterno: 'Fernandez', materno: 'Cespedes', nombres: 'Yamile', nivel: 'PRIMARIA', gradoOrden: 1, letra: 'A', meses: [8] },
  { paterno: 'Flores', materno: 'Mamani', nombres: 'Moises', nivel: 'PRIMARIA', gradoOrden: 1, letra: 'A', meses: [8] },
  { paterno: 'Vaca', materno: 'Romero', nombres: 'Dominic Ezequiel', nivel: 'PRIMARIA', gradoOrden: 1, letra: 'A', meses: [4, 5, 6, 7, 8] },
  // Pri 2° A
  { paterno: 'Soto', materno: 'Saygua', nombres: 'Eidan Khaled', nivel: 'PRIMARIA', gradoOrden: 2, letra: 'A', meses: [6, 7, 8] },
  // Pri 2° B
  { paterno: 'Bejarano', materno: 'Menacho', nombres: 'Franco', nivel: 'PRIMARIA', gradoOrden: 2, letra: 'B', meses: [8] },
  { paterno: 'Machicado', materno: 'Huaranca', nombres: 'Bruno Maximiliano', nivel: 'PRIMARIA', gradoOrden: 2, letra: 'B', meses: [8] },
  { paterno: 'Mendoza', materno: 'Zurita', nombres: 'Mathias Jorge', nivel: 'PRIMARIA', gradoOrden: 2, letra: 'B', meses: [8] },
  { paterno: 'Rojas', materno: 'Ipurani', nombres: 'Joaquin De Jesus', nivel: 'PRIMARIA', gradoOrden: 2, letra: 'B', meses: [8] },
  // Pri 3° A
  { paterno: 'Atanacio', materno: 'Garcia', nombres: 'Jaszeel Cretcel', nivel: 'PRIMARIA', gradoOrden: 3, letra: 'A', meses: [8] },
  { paterno: 'Ayala', materno: 'Canceco', nombres: 'Itzel Nicolle', nivel: 'PRIMARIA', gradoOrden: 3, letra: 'A', meses: [8] },
  { paterno: 'Cano', materno: 'Cruz', nombres: 'Cristopher Darell', nivel: 'PRIMARIA', gradoOrden: 3, letra: 'A', meses: [8] },
  { paterno: 'Condori', materno: 'Pacoricona', nombres: 'Lian Daineris', nivel: 'PRIMARIA', gradoOrden: 3, letra: 'A', meses: [7, 8] },
  { paterno: 'Nova', materno: 'Garcia', nombres: 'Carlos Augusto', nivel: 'PRIMARIA', gradoOrden: 3, letra: 'A', meses: [8] },
  // Pri 4° A
  { paterno: 'Cabrera', materno: 'Zuñiga', nombres: 'Kate Florence', nivel: 'PRIMARIA', gradoOrden: 4, letra: 'A', meses: [8] },
  { paterno: 'Chirari', materno: 'Teran', nombres: 'Shaira Belen', nivel: 'PRIMARIA', gradoOrden: 4, letra: 'A', meses: [8] },
  { paterno: 'Perez', materno: 'Ticona', nombres: 'Lian Mateo', nivel: 'PRIMARIA', gradoOrden: 4, letra: 'A', meses: [8] },
  { paterno: 'Rodriguez', materno: 'Torres', nombres: 'Brisa Briana', nivel: 'PRIMARIA', gradoOrden: 4, letra: 'A', meses: [8] },
  // Pri 5° A
  { paterno: 'Aguilar', materno: 'Huanca', nombres: 'Jhamel Jeremy', nivel: 'PRIMARIA', gradoOrden: 5, letra: 'A', meses: [7, 8] },
  { paterno: 'Atanacio', materno: 'Garcia', nombres: 'Paola Maria', nivel: 'PRIMARIA', gradoOrden: 5, letra: 'A', meses: [8] },
  { paterno: 'Buendia', materno: 'Delgadillo', nombres: 'Ian Zein', nivel: 'PRIMARIA', gradoOrden: 5, letra: 'A', meses: [8] },
  { paterno: 'Choque', materno: 'Martinez', nombres: 'Abdiel', nivel: 'PRIMARIA', gradoOrden: 5, letra: 'A', meses: [8] },
  { paterno: 'Gonzales', materno: 'Corrales', nombres: 'Tatiana Madelen Tamara', nivel: 'PRIMARIA', gradoOrden: 5, letra: 'A', meses: [8] },
  { paterno: 'Martinez', materno: 'Ticona', nombres: 'Adriana Valentina', nivel: 'PRIMARIA', gradoOrden: 5, letra: 'A', meses: [8] },
  { paterno: 'Nina', materno: 'Flores', nombres: 'Angela Valeria', nivel: 'PRIMARIA', gradoOrden: 5, letra: 'A', meses: [6, 7, 8] },
  { paterno: 'Rojas', materno: 'Medrano', nombres: 'Pablo Santiago', nivel: 'PRIMARIA', gradoOrden: 5, letra: 'A', meses: [8] },
  { paterno: 'Vaca', materno: 'Romero', nombres: 'Antonella Guadalupe', nivel: 'PRIMARIA', gradoOrden: 5, letra: 'A', meses: [4, 5, 6, 7, 8] },
  // Pri 6° A
  { paterno: 'Arispe', materno: 'Cadiz', nombres: 'Thiago Airton', nivel: 'PRIMARIA', gradoOrden: 6, letra: 'A', meses: [8] },
  { paterno: 'Catorceno', materno: 'Valencia', nombres: 'Luciana Valery', nivel: 'PRIMARIA', gradoOrden: 6, letra: 'A', meses: [8] },
  { paterno: 'Fernandez', materno: 'Lizarazo', nombres: 'Valentina Romina', nivel: 'PRIMARIA', gradoOrden: 6, letra: 'A', meses: [7, 8] },
  { paterno: 'Huanca', materno: 'Almendras', nombres: 'Mia Mishel', nivel: 'PRIMARIA', gradoOrden: 6, letra: 'A', meses: [8] },
  { paterno: 'Ramos', materno: 'Flores', nombres: 'Brandon', nivel: 'PRIMARIA', gradoOrden: 6, letra: 'A', meses: [8] },
  { paterno: 'Totora', materno: 'Flores', nombres: 'James Kervin', nivel: 'PRIMARIA', gradoOrden: 6, letra: 'A', meses: [6, 7, 8] },
  // Sec 1° A
  { paterno: 'Aguilar', materno: 'Garnica', nombres: 'Kendra Maite', nivel: 'SECUNDARIA', gradoOrden: 1, letra: 'A', meses: [8] },
  { paterno: 'Cornejo', materno: 'Rocha', nombres: 'Mariana Valeria', nivel: 'SECUNDARIA', gradoOrden: 1, letra: 'A', meses: [8] },
  { paterno: 'Torrico', materno: 'Andrade', nombres: 'Antonella Ariana', nivel: 'SECUNDARIA', gradoOrden: 1, letra: 'A', meses: [8] },
  // Sec 2° A
  { paterno: 'Aviles', materno: 'Delgado', nombres: 'Anny Mikeyla', nivel: 'SECUNDARIA', gradoOrden: 2, letra: 'A', meses: [5, 6, 7, 8] },
  { paterno: 'Baldiviezo', materno: 'Maita', nombres: 'Itzel Antonela', nivel: 'SECUNDARIA', gradoOrden: 2, letra: 'A', meses: [8] },
  { paterno: 'Coria', materno: 'Zenteno', nombres: 'Leire Nashira', nivel: 'SECUNDARIA', gradoOrden: 2, letra: 'A', meses: [8] },
  { paterno: 'Flores', materno: 'Gutierrez', nombres: 'Jael Jonathan', nivel: 'SECUNDARIA', gradoOrden: 2, letra: 'A', meses: [5, 6, 7, 8] },
  { paterno: 'Flores', materno: 'Mamani', nombres: 'Joel Ernesto', nivel: 'SECUNDARIA', gradoOrden: 2, letra: 'A', meses: [8] },
  { paterno: 'Machicado', materno: 'Huaranca', nombres: 'Anabel', nivel: 'SECUNDARIA', gradoOrden: 2, letra: 'A', meses: [8] },
  { paterno: 'Ortiz', materno: 'Saigua', nombres: 'Roybell Saim', nivel: 'SECUNDARIA', gradoOrden: 2, letra: 'A', meses: [6, 7, 8] },
  { paterno: 'Rondo', materno: 'Cazorla', nombres: 'Marioly Teylor', nivel: 'SECUNDARIA', gradoOrden: 2, letra: 'A', meses: [8] },
  { paterno: 'Terrazas', materno: 'Rodriguez', nombres: 'Dariel Anghelo', nivel: 'SECUNDARIA', gradoOrden: 2, letra: 'A', meses: [5, 6, 7, 8] },
  { paterno: 'Torrico', materno: 'Loza', nombres: 'Nicol Guadalupe', nivel: 'SECUNDARIA', gradoOrden: 2, letra: 'A', meses: [8] },
  { paterno: 'Vargas', materno: 'Foronda', nombres: 'Rivana Michelle', nivel: 'SECUNDARIA', gradoOrden: 2, letra: 'A', meses: [7, 8] },
  // Sec 3° A
  { paterno: 'Calahuaylla', materno: 'Zambrana', nombres: 'Gissel Luciana', nivel: 'SECUNDARIA', gradoOrden: 3, letra: 'A', meses: [8] }, // agregada al sistema el 06/09/2026, no estaba en la nómina original
  { paterno: 'Mendoza', materno: 'Zurita', nombres: 'Luis Carlos', nivel: 'SECUNDARIA', gradoOrden: 3, letra: 'A', meses: [8] },
  { paterno: 'Rivamontan', materno: 'Lampa', nombres: 'Maria Martha', nivel: 'SECUNDARIA', gradoOrden: 3, letra: 'A', meses: [8] },
  { paterno: 'Terrazas', materno: 'Rodriguez', nombres: 'Rossemary Nicol', nivel: 'SECUNDARIA', gradoOrden: 3, letra: 'A', meses: [5, 6, 7, 8] },
  // Sec 4° A
  { paterno: 'Choque', materno: 'Martinez', nombres: 'Brandon', nivel: 'SECUNDARIA', gradoOrden: 4, letra: 'A', meses: [8] },
  { paterno: 'Fernandez', materno: 'Choque', nombres: 'Fabio Raul', nivel: 'SECUNDARIA', gradoOrden: 4, letra: 'A', meses: [7, 8] },
  { paterno: 'Gonzales', materno: 'Corrales', nombres: 'Melany Nuria', nivel: 'SECUNDARIA', gradoOrden: 4, letra: 'A', meses: [8] },
  { paterno: 'Morales', materno: 'Jimenez', nombres: 'Nicolas', nivel: 'SECUNDARIA', gradoOrden: 4, letra: 'A', meses: [8] },
  { paterno: 'Ortiz', materno: 'Saigua', nombres: 'Mel Antony', nivel: 'SECUNDARIA', gradoOrden: 4, letra: 'A', meses: [6, 7, 8] },
  { paterno: 'Totora', materno: 'Flores', nombres: 'Airton Marcelo Joau', nivel: 'SECUNDARIA', gradoOrden: 4, letra: 'A', meses: [7, 8] },
  { paterno: '', materno: 'Vidal', nombres: 'Sebastian', nivel: 'SECUNDARIA', gradoOrden: 4, letra: 'A', meses: [8] },
  { paterno: 'Villan', materno: 'Mamani', nombres: 'Saul Richard', nivel: 'SECUNDARIA', gradoOrden: 4, letra: 'A', meses: [8] },
  // Sec 4° B
  { paterno: 'Campos', materno: 'Manu', nombres: 'Esther Valentina', nivel: 'SECUNDARIA', gradoOrden: 4, letra: 'B', meses: [8] },
  // Sec 5° A
  { paterno: 'Aguilar', materno: 'Huanca', nombres: 'Jesus', nivel: 'SECUNDARIA', gradoOrden: 5, letra: 'A', meses: [7, 8] },
  { paterno: 'Bautista', materno: 'Coro', nombres: 'Sheyla', nivel: 'SECUNDARIA', gradoOrden: 5, letra: 'A', meses: [8] },
  { paterno: 'Cabrera', materno: 'Zuñiga', nombres: 'Luis Marcelo', nivel: 'SECUNDARIA', gradoOrden: 5, letra: 'A', meses: [8] },
  { paterno: 'Copali', materno: 'Bolivar', nombres: 'Priscila', nivel: 'SECUNDARIA', gradoOrden: 5, letra: 'A', meses: [8] },
  { paterno: 'Laruta', materno: 'Pinto', nombres: 'Edward Isaac', nivel: 'SECUNDARIA', gradoOrden: 5, letra: 'A', meses: [8] },
  { paterno: 'Lizarazu', materno: 'Mamani', nombres: 'Genesis Bianca', nivel: 'SECUNDARIA', gradoOrden: 5, letra: 'A', meses: [7, 8] },
  { paterno: 'Quispe', materno: 'Apaza', nombres: 'Amira Rosario', nivel: 'SECUNDARIA', gradoOrden: 5, letra: 'A', meses: [8] },
  { paterno: 'Sonaglia', materno: 'Soliz', nombres: 'Nicolas Giovanni', nivel: 'SECUNDARIA', gradoOrden: 5, letra: 'A', meses: [8] },
  { paterno: 'Soto', materno: 'Saygua', nombres: 'Solansh Sanjana', nivel: 'SECUNDARIA', gradoOrden: 5, letra: 'A', meses: [6, 7, 8] },
  // Sec 6° A
  { paterno: 'Condori', materno: 'Estrada', nombres: 'Leonel Dennis', nivel: 'SECUNDARIA', gradoOrden: 6, letra: 'A', meses: [7, 8] },
  { paterno: 'Copali', materno: 'Bolivar', nombres: 'Camila', nivel: 'SECUNDARIA', gradoOrden: 6, letra: 'A', meses: [8] },
  { paterno: 'Fernandez', materno: 'Diaz', nombres: 'Camila', nivel: 'SECUNDARIA', gradoOrden: 6, letra: 'A', meses: [8] },
  { paterno: 'Flores', materno: 'Mamani', nombres: 'Rodrigo', nivel: 'SECUNDARIA', gradoOrden: 6, letra: 'A', meses: [8] },
  { paterno: 'Guaman', materno: 'Mamani', nombres: 'Margoth', nivel: 'SECUNDARIA', gradoOrden: 6, letra: 'A', meses: [6, 7, 8] },
  { paterno: 'Vidal', materno: 'Campos', nombres: 'Jhosenth Nelson', nivel: 'SECUNDARIA', gradoOrden: 6, letra: 'A', meses: [8] },
]

function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
}
function norm(s: string): string {
  return stripAccents(s).toUpperCase().replace(/\s+/g, ' ').trim()
}
function ultimoDiaDelMes(anno: number, mes: number): Date {
  return new Date(anno, mes, 0) // día 0 del mes siguiente = último día de "mes"
}

async function main() {
  const prisma = new PrismaClient({ datasources: { db: { url: process.env['DIRECT_URL'] } } })

  const gestion = await prisma.gestion.findFirst({ where: { activa: true } })
  if (!gestion) throw new Error('No hay gestión activa')

  const niveles = await prisma.nivel.findMany()
  const nivelIdPorNombre = new Map(niveles.map(n => [n.nombre, n.id]))

  const tarifas = await prisma.tarifaPension.findMany({ where: { gestion_id: gestion.id }, include: { nivel: true } })
  const tarifaPorNivel = new Map(tarifas.map(t => [t.nivel.nombre, Number(t.monto)]))

  // ── 1. Matchear cada deudor contra la base ────────────────────────────────
  const deudorPorEstudiante = new Map<string, Set<number>>()
  const noEncontrados: DeudorRaw[] = []
  const identificados: string[] = []

  for (const d of DEUDORES) {
    const nivel_id = nivelIdPorNombre.get(d.nivel)
    const grado = nivel_id ? await prisma.grado.findFirst({ where: { nivel_id, orden: d.gradoOrden } }) : null
    const paralelo = grado ? await prisma.paralelo.findFirst({ where: { grado_id: grado.id, letra: d.letra } }) : null
    if (!paralelo) { noEncontrados.push(d); continue }

    const apellidoNorm = norm([d.paterno, d.materno].filter(Boolean).join(' '))
    const nombreNorm = norm(d.nombres)

    const candidatos = await prisma.matricula.findMany({
      where: { paralelo_id: paralelo.id, gestion_id: gestion.id },
      include: { estudiante: { include: { usuario: true } } },
    })
    const match = candidatos.find(c =>
      norm(c.estudiante.usuario.apellido) === apellidoNorm && norm(c.estudiante.usuario.nombre) === nombreNorm
    )
    if (!match) { noEncontrados.push(d); continue }

    const set = deudorPorEstudiante.get(match.estudiante.id) ?? new Set<number>()
    for (const m of d.meses) set.add(m)
    deudorPorEstudiante.set(match.estudiante.id, set)
    identificados.push(`${d.paterno} ${d.materno}, ${d.nombres}`)
  }

  console.log(`Deudores del reporte: ${DEUDORES.length}`)
  console.log(`Identificados en la base: ${deudorPorEstudiante.size}`)
  if (noEncontrados.length) {
    console.log(`\n⚠ NO ENCONTRADOS (${noEncontrados.length}) — revisar nombre/curso:`)
    for (const d of noEncontrados) {
      console.log(`  - ${d.paterno} ${d.materno}, ${d.nombres} — ${d.nivel} orden ${d.gradoOrden} "${d.letra}"`)
    }
  }

  // ── 2. Reconciliar TODAS las pensiones Feb-Ago de estudiantes activos ────
  const matriculas = await prisma.matricula.findMany({
    where: { gestion_id: gestion.id },
    include: {
      estudiante: { select: { id: true, becado: true, media_beca: true, estado: true } },
      paralelo:   { include: { grado: { include: { nivel: true } } } },
    },
  })

  const existentes = await prisma.pension.findMany({
    where: { gestion_id: gestion.id, mes: { in: MESES_A_RECONCILIAR } },
  })
  const existentesMap = new Map(existentes.map(p => [`${p.estudiante_id}-${p.mes}`, p]))

  interface Crear { estudiante_id: string; gestion_id: string; mes: number; nivel_id: string; monto: number; pagado: boolean; fecha_pago: Date | null }
  interface Actualizar { id: string; pagado: boolean; monto: number; fecha_pago: Date | null; comprobante: string | null }

  const porCrear: Crear[] = []
  const porActualizar: Actualizar[] = []
  let sinCambio = 0
  let becadosOmitidos = 0
  let inactivosOmitidos = 0
  let sinTarifa = 0

  for (const m of matriculas) {
    if (m.estudiante.becado) { becadosOmitidos++; continue }
    if (m.estudiante.estado !== 'ACTIVO') { inactivosOmitidos++; continue }
    const nivelNombre = m.paralelo.grado.nivel.nombre
    const tarifaBase = tarifaPorNivel.get(nivelNombre)
    if (tarifaBase == null) { sinTarifa++; continue }
    const monto = m.estudiante.media_beca ? tarifaBase / 2 : tarifaBase
    const debeMeses = deudorPorEstudiante.get(m.estudiante.id) ?? new Set<number>()

    for (const mes of MESES_A_RECONCILIAR) {
      const pagado = !debeMeses.has(mes)
      const key = `${m.estudiante.id}-${mes}`
      const existente = existentesMap.get(key)

      if (!existente) {
        porCrear.push({
          estudiante_id: m.estudiante.id, gestion_id: gestion.id, mes,
          nivel_id: m.paralelo.grado.nivel_id, monto,
          pagado, fecha_pago: pagado ? ultimoDiaDelMes(gestion.anno, mes) : null,
        })
      } else if (existente.pagado !== pagado || Number(existente.monto) !== monto) {
        porActualizar.push({
          id: existente.id, pagado, monto,
          fecha_pago:  pagado ? (existente.fecha_pago ?? ultimoDiaDelMes(gestion.anno, mes)) : null,
          comprobante: pagado ? existente.comprobante : null,
        })
      } else {
        sinCambio++
      }
    }
  }

  console.log('\n──────────────────────────────────────────────')
  console.log(`  Pensiones a crear:      ${porCrear.length}`)
  console.log(`  Pensiones a actualizar: ${porActualizar.length}`)
  console.log(`  Sin cambio:             ${sinCambio}`)
  console.log(`  Becados omitidos:       ${becadosOmitidos}`)
  console.log(`  No-activos omitidos:    ${inactivosOmitidos}`)
  if (sinTarifa) console.log(`  Sin tarifa configurada: ${sinTarifa}`)
  console.log('──────────────────────────────────────────────')

  const flipsAPendiente = porActualizar.filter(a => !a.pagado).length
  const flipsAPagado    = porActualizar.filter(a => a.pagado).length
  console.log(`  De esas actualizaciones: ${flipsAPendiente} pasan a PENDIENTE, ${flipsAPagado} pasan a PAGADO`)

  if (!COMMIT) {
    console.log('\nNada se escribió — corré con --commit para aplicar de verdad.')
    await prisma.$disconnect()
    return
  }

  // ── 3. Escribir ────────────────────────────────────────────────────────
  const CHUNK = 500
  for (let i = 0; i < porCrear.length; i += CHUNK) {
    await prisma.pension.createMany({ data: porCrear.slice(i, i + CHUNK) })
  }
  for (const a of porActualizar) {
    await prisma.pension.update({
      where: { id: a.id },
      data:  { pagado: a.pagado, monto: a.monto, fecha_pago: a.fecha_pago, comprobante: a.comprobante },
    })
  }

  console.log(`\nListo. Creadas: ${porCrear.length}, actualizadas: ${porActualizar.length}.`)
  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
