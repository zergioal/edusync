/**
 * seed-demo-5to-a.ts — Pobla notas (T1+T2), asistencia diaria y pensiones reales
 * para 5° de Secundaria A, con resultados específicos por estudiante, para la
 * demo en vivo de la exposición. Script de un solo uso.
 * Uso: npx tsx src/scripts/seed-demo-5to-a.ts  (desde apps/api)
 */

import 'dotenv/config'
import { prisma } from '@edusync/database'
import { Instrumento } from '@edusync/types'
import { PensionesService } from '../services/pensiones.service'

// ─── Indicadores por defecto — mismo set que planilla.service.ts#INDICADORES_DEFECTO ──

const INDICADORES_DEFECTO: Record<string, Array<{ nombre: string; instrumento: Instrumento }>> = {
  SER_DECIDIR: [
    { nombre: 'Observación de valores', instrumento: Instrumento.OBSERVACION },
  ],
  SABER: [
    { nombre: 'Prueba escrita 1', instrumento: Instrumento.EVALUACION_ESCRITA },
    { nombre: 'Prueba escrita 2', instrumento: Instrumento.EVALUACION_ESCRITA },
  ],
  HACER: [
    { nombre: 'Cuaderno de trabajo', instrumento: Instrumento.CUADERNO },
    { nombre: 'Trabajo práctico', instrumento: Instrumento.DEFENSA },
  ],
  AUTOEVALUACION: [
    { nombre: 'Autoevaluación', instrumento: Instrumento.OBSERVACION },
  ],
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pickRandom<T>(arr: T[], n: number): T[] {
  const copy = [...arr]
  const out: T[] = []
  for (let i = 0; i < n && copy.length > 0; i++) {
    const idx = Math.floor(Math.random() * copy.length)
    out.push(copy.splice(idx, 1)[0]!)
  }
  return out
}

async function main() {
  console.log('=== Seed demo — 5° de Secundaria A ===\n')

  const gestion = await prisma.gestion.findFirst({
    where: { activa: true },
    include: { trimestres: { orderBy: { numero: 'asc' } } },
  })
  if (!gestion) throw new Error('No hay gestión activa')
  const [t1, t2] = gestion.trimestres
  if (!t1 || !t2) throw new Error('Faltan trimestres 1 y 2 en la gestión activa')
  console.log(`Gestión ${gestion.anno} — T1 ${t1.id} / T2 ${t2.id}`)

  const paralelo = await prisma.paralelo.findFirst({
    where: { letra: 'A', grado: { nombre: { contains: '5°' }, nivel: { nombre: 'SECUNDARIA' } } },
    include: { grado: { include: { nivel: true } } },
  })
  if (!paralelo) throw new Error('No se encontró el paralelo 5° de Secundaria A')
  const institucion_id = paralelo.grado.nivel.institucion_id

  const matriculas = await prisma.matricula.findMany({
    where: { paralelo_id: paralelo.id, gestion_id: gestion.id },
    include: { estudiante: { include: { usuario: { select: { nombre: true, apellido: true } } } } },
  })
  console.log(`Estudiantes matriculados: ${matriculas.length}`)

  function findEst(apellidoContains: string, nombreContains?: string): string {
    const m = matriculas.find(m =>
      m.estudiante.usuario.apellido.toUpperCase().includes(apellidoContains.toUpperCase())
      && (!nombreContains || m.estudiante.usuario.nombre.toUpperCase().includes(nombreContains.toUpperCase()))
    )
    if (!m) throw new Error(`No se encontró estudiante: ${apellidoContains} ${nombreContains ?? ''}`)
    return m.estudiante_id
  }

  const idAguilarJesus  = findEst('AGUILAR HUANCA', 'JESUS')
  const idMamani        = findEst('MAMANI RIOS')
  const idConde         = findEst('CONDE PAQUI')
  const idPenaloza      = findEst('PENALOZA PORCO')
  const idChambilla     = findEst('CHAMBILLA')
  const idVerduguez     = findEst('VERDUGUEZ')
  const idCopaliPris    = findEst('COPALI')
  const idAguilarDaniel = findEst('AGUILAR ROMAY', 'DANIEL')
  const idCamacho       = findEst('CAMACHO')

  const asignaciones = await prisma.asignacion.findMany({
    where: { paralelo_id: paralelo.id, gestion_id: gestion.id },
    select: { id: true, materia: { select: { nombre: true } } },
  })
  console.log(`Asignaciones (materias): ${asignaciones.length}`)

  const dimensiones = await prisma.dimension.findMany({
    where: { institucion_id },
    orderBy: { orden: 'asc' },
  })
  console.log(`Dimensiones: ${dimensiones.map(d => `${d.nombre}(${d.puntaje_max})`).join(', ')}\n`)

  // ── Bandas de notas por estudiante ─────────────────────────────────────────

  interface Banda { normal: [number, number]; fallas?: Set<string>; fallaRango?: [number, number] }
  const bandas = new Map<string, Banda>()
  for (const m of matriculas) bandas.set(m.estudiante_id, { normal: [50, 74] })

  const asignacionIds = asignaciones.map(a => a.id)
  for (const id of [idAguilarJesus, idMamani, idConde, idPenaloza]) {
    bandas.set(id, { normal: [52, 72], fallas: new Set(pickRandom(asignacionIds, 5)), fallaRango: [20, 48] })
  }
  bandas.set(idChambilla,     { normal: [50, 62], fallas: new Set(pickRandom(asignacionIds, 11)), fallaRango: [15, 45] })
  bandas.set(idAguilarDaniel, { normal: [78, 84] })
  bandas.set(idCopaliPris,    { normal: [86, 92] })
  bandas.set(idVerduguez,     { normal: [94, 100] })

  function targetPct(estudianteId: string, asignacionId: string): number {
    const b = bandas.get(estudianteId)!
    if (b.fallas?.has(asignacionId) && b.fallaRango) return rand(b.fallaRango[0], b.fallaRango[1])
    return rand(b.normal[0], b.normal[1])
  }

  // ── Notas: por asignación × trimestre, sembrar indicadores y notas ─────────

  for (const trimestre of [t1, t2]) {
    console.log(`--- Trimestre ${trimestre.numero} ---`)
    for (const asignacion of asignaciones) {
      const dimIndicadores = new Map<string, string[]>()

      for (const dim of dimensiones) {
        let inds = await prisma.indicador.findMany({
          where: { asignacion_id: asignacion.id, trimestre_id: trimestre.id, dimension_id: dim.id },
        })
        if (inds.length === 0) {
          const defaults = INDICADORES_DEFECTO[dim.nombre] ?? []
          inds = await Promise.all(defaults.map((d, orden) =>
            prisma.indicador.create({
              data: {
                asignacion_id: asignacion.id, dimension_id: dim.id, trimestre_id: trimestre.id,
                nombre: d.nombre, instrumento: d.instrumento,
                fecha_aplicacion: trimestre.fecha_inicio, orden,
              },
            })
          ))
        }
        dimIndicadores.set(dim.id, inds.map(i => i.id))
      }

      const notasData: Array<{ indicador_id: string; estudiante_id: string; puntaje: number }> = []
      for (const m of matriculas) {
        const pct = targetPct(m.estudiante_id, asignacion.id)
        for (const dim of dimensiones) {
          const valor = Math.max(1, Math.round((pct / 100) * dim.puntaje_max))
          for (const indId of dimIndicadores.get(dim.id) ?? []) {
            notasData.push({ indicador_id: indId, estudiante_id: m.estudiante_id, puntaje: valor })
          }
        }
      }
      await prisma.notaIndicador.createMany({ data: notasData, skipDuplicates: true })
      console.log(`  ${asignacion.materia.nombre}: ${notasData.length} notas`)
    }
  }

  // ── Asistencia diaria: lunes a sábado, desde el inicio de T1 hasta hoy ─────

  const regente = await prisma.usuario.findFirst({ where: { rol: 'REGENTE', institucion_id } })
  if (!regente) throw new Error('No hay usuario regente en la institución')
  const contador = await prisma.usuario.findFirst({ where: { rol: 'CONTADOR', institucion_id } })
  if (!contador) throw new Error('No hay usuario contador en la institución')

  const RECESO_INICIO = new Date(gestion.anno, 6, 6)  // 6 de julio
  const RECESO_FIN    = new Date(gestion.anno, 6, 25) // 25 de julio (inclusive)
  const inicioClases   = new Date(t1.fecha_inicio)
  const hoy            = new Date()

  const diasClase: Date[] = []
  for (const d = new Date(inicioClases); d <= hoy; d.setDate(d.getDate() + 1)) {
    if (d.getDay() === 0) continue // domingo
    if (d >= RECESO_INICIO && d <= RECESO_FIN) continue // receso de invierno
    diasClase.push(new Date(d))
  }
  console.log(`\nDías de clase (lunes a sábado, sin receso): ${diasClase.length}`)

  const ausenciasPorEstudiante = new Map<string, Set<string>>()
  function sortearAusencias(estId: string, cantidad: number) {
    const elegidos = pickRandom(diasClase, cantidad)
    ausenciasPorEstudiante.set(estId, new Set(elegidos.map(d => d.toISOString().slice(0, 10))))
  }
  sortearAusencias(idAguilarJesus, 7)
  sortearAusencias(idCamacho, 7)
  sortearAusencias(idChambilla, 22)

  const asistData: Array<{ regente_id: string; paralelo_id: string; estudiante_id: string; fecha: Date; estado: 'PRESENTE' | 'AUSENTE' }> = []
  for (const dia of diasClase) {
    const fechaIso = dia.toISOString().slice(0, 10)
    for (const m of matriculas) {
      const ausente = ausenciasPorEstudiante.get(m.estudiante_id)?.has(fechaIso) ?? false
      asistData.push({
        regente_id: regente.id, paralelo_id: paralelo.id, estudiante_id: m.estudiante_id,
        fecha: dia, estado: ausente ? 'AUSENTE' : 'PRESENTE',
      })
    }
  }
  console.log(`Registros de asistencia a insertar: ${asistData.length}`)
  for (let i = 0; i < asistData.length; i += 2000) {
    await prisma.asistenciaDiaria.createMany({ data: asistData.slice(i, i + 2000), skipDuplicates: true })
  }

  // ── Pensiones: tarifa + generación febrero-agosto + pagos ──────────────────

  let tarifa = await prisma.tarifaPension.findUnique({
    where: { gestion_id_nivel_id: { gestion_id: gestion.id, nivel_id: paralelo.grado.nivel_id } },
  })
  if (!tarifa) {
    tarifa = await prisma.tarifaPension.create({
      data: { institucion_id, gestion_id: gestion.id, nivel_id: paralelo.grado.nivel_id, monto: 250 },
    })
    console.log('\nTarifa creada: Bs 250 — Secundaria')
  } else {
    console.log(`\nTarifa existente: Bs ${tarifa.monto} — Secundaria`)
  }

  const pensionesService = new PensionesService()
  for (let mes = 2; mes <= 8; mes++) {
    const r = await pensionesService.generarMes(institucion_id, gestion.id, mes)
    console.log(`Pensiones mes ${mes}: ${r.creadas} creadas, ${r.omitidas_duplicadas} ya existían, ${r.omitidas_becados} becados omitidos`)
  }

  const noPaganAgosto = new Set([
    idAguilarJesus, findEst('BAUTISTA', 'SHEYLA'), findEst('CABRERA'), idChambilla, idCopaliPris,
    findEst('ESPINOZA'), findEst('HERRERA'), findEst('LARUTA'), findEst('LIZARAZU'),
    findEst('QUISPE'), findEst('REQUE'), findEst('SONAGLIA'), findEst('SOTO SAYGUA', 'SOLANSH'),
    findEst('VELARDE'),
  ])
  console.log(`\nEstudiantes que NO pagan la pensión de agosto (quedan bloqueados): ${noPaganAgosto.size}`)

  let pagosCreados = 0
  for (const m of matriculas) {
    if (m.estudiante.becado) continue
    for (let mes = 2; mes <= 8; mes++) {
      if (mes === 8 && noPaganAgosto.has(m.estudiante_id)) continue
      const pension = await prisma.pension.findUnique({
        where: { estudiante_id_gestion_id_mes: { estudiante_id: m.estudiante_id, gestion_id: gestion.id, mes } },
      })
      if (!pension || pension.pagado) continue
      const fechaPago = new Date(gestion.anno, mes - 1, 10)
      const comprobante = `DEMO-${mes}-${pension.id.slice(0, 6)}`
      await prisma.$transaction([
        prisma.pension.update({ where: { id: pension.id }, data: { pagado: true, fecha_pago: fechaPago, comprobante } }),
        prisma.pago.create({ data: { pension_id: pension.id, registrado_por: contador.id, fecha: fechaPago, comprobante } }),
      ])
      pagosCreados++
    }
  }
  console.log(`Pagos registrados: ${pagosCreados}`)

  console.log('\n=== Listo ===')
  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
