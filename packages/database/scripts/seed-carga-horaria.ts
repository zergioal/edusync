/**
 * Puebla CargaHorariaMateria con horas_mes = horas_semanales × 4 para
 * todas las combinaciones materia × grado, coherente con los valores
 * de horas_semanales (Ley 070) cargados por seed-horas-materias.ts.
 *
 * Uso:
 *   cd packages/database
 *   tsx scripts/seed-carga-horaria.ts
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'
import { PrismaClient } from '@prisma/client'

try {
  const c = readFileSync(resolve(__dirname, '../.env'), 'utf-8')
  for (const l of c.split('\n')) {
    const m = l.match(/^([A-Z_][A-Z0-9_]*)="?([^"\n]*)"?\s*$/)
    if (m && !process.env[m[1]!]) process.env[m[1]!] = m[2]!
  }
} catch {}

const prisma = new PrismaClient()

async function main() {
  console.log('\n📅 Poblando CargaHorariaMateria — horas_mes = horas_semanales × 4\n')

  const materias = await prisma.materia.findMany({
    where:   { activa: true },
    include: { nivel: true },
  })

  const grados = await prisma.grado.findMany()
  const gradosByNivel = new Map<string, typeof grados>()
  for (const g of grados) {
    const list = gradosByNivel.get(g.nivel_id) ?? []
    list.push(g)
    gradosByNivel.set(g.nivel_id, list)
  }

  let upserted = 0
  let skipped  = 0

  for (const materia of materias) {
    const horas_sem = materia.horas_semanales
    if (!horas_sem) {
      console.warn(`  ⚠  Sin horas_semanales: [${materia.nivel.nombre}] "${materia.nombre}" — omitida`)
      skipped++
      continue
    }

    const horas_mes = horas_sem * 4
    const gradosDeNivel = gradosByNivel.get(materia.nivel_id) ?? []

    for (const grado of gradosDeNivel) {
      await prisma.cargaHorariaMateria.upsert({
        where:  { materia_id_grado_id: { materia_id: materia.id, grado_id: grado.id } },
        create: { materia_id: materia.id, grado_id: grado.id, horas_mes },
        update: { horas_mes },
      })
      upserted++
    }

    console.log(
      `  ✓ [${materia.nivel.nombre}] ${materia.nombre} → ${horas_sem} h/sem × 4 = ${horas_mes} h/mes (${gradosDeNivel.length} grados)`
    )
  }

  console.log(`
╔══════════════════════════════════════════════╗
║  Carga horaria poblada                       ║
╠══════════════════════════════════════════════╣
║  Registros upsert:  ${String(upserted).padEnd(25)}║
║  Materias omitidas: ${String(skipped).padEnd(25)}║
╚══════════════════════════════════════════════╝
  `)
}

main()
  .catch(e => { console.error('❌ Error:', e.message ?? e); process.exit(1) })
  .finally(() => prisma.$disconnect())
