import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

async function main() {
  const prisma = new PrismaClient({ datasources: { db: { url: process.env['DIRECT_URL'] } } })

  const grados = await prisma.grado.findMany({
    include: { paralelos: true, nivel: true },
    orderBy: [{ nivel: { nombre: 'asc' } }, { nombre: 'asc' }],
  })

  let created = 0
  for (const g of grados) {
    if (g.paralelos.length === 0) {
      await prisma.paralelo.create({ data: { letra: 'A', grado_id: g.id } })
      console.log(`  + Paralelo A creado → ${g.nivel.nombre} ${g.nombre}`)
      created++
    } else {
      console.log(`  ~ OK: ${g.nivel.nombre} ${g.nombre} → [${g.paralelos.map(p => p.letra).join(', ')}]`)
    }
  }

  console.log(`\nParalelos creados: ${created}`)
  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
