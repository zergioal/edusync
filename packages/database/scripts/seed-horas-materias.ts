/**
 * Actualiza horas_semanales en todas las materias regulares.
 * Valores basados en la malla curricular Ley 070 — Bolivia.
 * Confirmado por la institución: Matemática = 5 h/sem (20 h/mes).
 *
 * Uso:
 *   cd packages/database
 *   tsx scripts/seed-horas-materias.ts
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

// Horas semanales por nivel y nombre de materia (Ley 070)
const HORAS: Record<string, Record<string, number>> = {
  INICIAL: {
    'Clases': 30,
  },
  PRIMARIA: {
    'Matemática':                                              5,
    'Comunicación y Lenguajes: Lengua Castellana, Originaria y Extranjera': 6,
    'Ciencias Naturales':                                      3,
    'Ciencias Sociales':                                       3,
    'Educación Física y Deportes':                             2,
    'Educación Musical':                                       2,
    'Artes Plásticas y Visuales':                              2,
    'Valores, Espiritualidades y Religiones':                  2,
    'Cosmovisiones, Filosofía y Psicología':                   2,
    'Técnica Tecnológica':                                     4,
  },
  SECUNDARIA: {
    'Matemática':                                              5,
    'Cosmovisiones, Filosofía y Psicología':                   2,
    'Valores, Espiritualidades y Religiones':                  2,
    'Comunicación y Lenguajes: Lengua Castellana y Originaria':4,
    'Lengua Extranjera':                                       3,
    'Ciencias Sociales':                                       3,
    'Educación Física y Deportes':                             2,
    'Educación Musical':                                       2,
    'Artes Plásticas y Visuales':                              2,
    'Ciencias Naturales: Biología-Geografía':                  2,
    'Ciencias Naturales: Química':                             2,
    'Ciencias Naturales: Física':                              2,
    'Técnica Tecnológica General':                             4,
    'Técnica Tecnológica Especializada':                       10,
  },
}

async function main() {
  console.log('\n📚 Actualizando horas_semanales de materias — Ley 070\n')

  let updated = 0
  let skipped = 0

  for (const [nivelNombre, materiaHoras] of Object.entries(HORAS)) {
    const niveles = await prisma.nivel.findMany({ where: { nombre: nivelNombre } })
    for (const nivel of niveles) {
      for (const [materiaNombre, horas] of Object.entries(materiaHoras)) {
        const mat = await prisma.materia.findFirst({
          where: { nivel_id: nivel.id, nombre: materiaNombre, es_subarea_de_id: null },
        })
        if (!mat) {
          console.warn(`  ⚠  No encontrada: [${nivelNombre}] "${materiaNombre}"`)
          skipped++
          continue
        }
        await prisma.materia.update({
          where: { id: mat.id },
          data:  { horas_semanales: horas },
        })
        console.log(`  ✓ [${nivelNombre}] ${materiaNombre} → ${horas} h/sem (${horas * 4} h/mes)`)
        updated++
      }
    }
  }

  console.log(`
╔══════════════════════════════════════════════╗
║  Actualización completada                    ║
╠══════════════════════════════════════════════╣
║  Actualizadas: ${String(updated).padEnd(29)}║
║  No encontradas: ${String(skipped).padEnd(27)}║
╚══════════════════════════════════════════════╝
  `)
}

main()
  .catch(e => { console.error('❌ Error:', e.message ?? e); process.exit(1) })
  .finally(() => prisma.$disconnect())
