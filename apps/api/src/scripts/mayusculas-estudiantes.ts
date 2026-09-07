/**
 * mayusculas-estudiantes.ts — Convierte a MAYÚSCULAS el nombre y apellido de todos
 * los usuarios con rol ESTUDIANTE (nuevos y preexistentes), para uniformar el
 * formato en todo el sistema.
 *
 * Uso: npx tsx src/scripts/mayusculas-estudiantes.ts  (desde apps/api)
 */

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

async function main() {
  const prisma = new PrismaClient({ datasources: { db: { url: process.env['DIRECT_URL'] } } })

  const estudiantes = await prisma.usuario.findMany({
    where: { rol: 'ESTUDIANTE' },
    select: { id: true, nombre: true, apellido: true },
  })

  console.log(`Estudiantes a actualizar: ${estudiantes.length}\n`)

  let cambiados = 0
  for (const u of estudiantes) {
    const nombre   = u.nombre.toLocaleUpperCase('es')
    const apellido = u.apellido.toLocaleUpperCase('es')
    if (nombre === u.nombre && apellido === u.apellido) continue
    await prisma.usuario.update({ where: { id: u.id }, data: { nombre, apellido } })
    cambiados++
  }

  console.log(`Actualizados: ${cambiados}`)
  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
