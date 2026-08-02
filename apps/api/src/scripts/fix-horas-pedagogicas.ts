import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

async function main() {
  const prisma = new PrismaClient({ datasources: { db: { url: process.env['DIRECT_URL'] } } })

  const docentes = await prisma.docente.findMany({
    include: {
      usuario: { select: { nombre: true, apellido: true } },
      asignaciones: {
        include: {
          materia:  { include: { carga_horaria: true } },
          paralelo: { include: { grado: true } },
        },
      },
    },
  })

  let updated = 0
  for (const doc of docentes) {
    const horas = doc.asignaciones.reduce((sum, a) => {
      const ch = a.materia.carga_horaria.find(c => c.grado_id === a.paralelo.grado_id)
      return sum + (ch?.horas_mes ?? (a.materia.horas_semanales ?? 0) * 4)
    }, 0)

    if (horas !== doc.horas_pedagogicas_total) {
      console.log(`  ~ ${doc.usuario.apellido}, ${doc.usuario.nombre}: ${doc.horas_pedagogicas_total} → ${horas}`)
      await prisma.docente.update({ where: { id: doc.id }, data: { horas_pedagogicas_total: horas } })
      updated++
    }
  }

  console.log(`\nDocentes actualizados: ${updated} / ${docentes.length}`)
  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
