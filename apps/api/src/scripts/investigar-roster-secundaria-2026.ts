/**
 * investigar-roster-secundaria-2026.ts — Script de solo lectura: lista TODOS los matriculados de
 * Secundaria de la gestión activa (cualquier estado — activo, retirado, trasladado — porque la
 * reasignación de contactos 2026 también debe alcanzar a los que se retiraron por si vuelven).
 * No escribe nada. Uso: npx tsx src/scripts/investigar-roster-secundaria-2026.ts (desde apps/api)
 */
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { writeFileSync } from 'fs'

const prisma = new PrismaClient()

async function main() {
  const inst = await prisma.institucion.findFirst()
  if (!inst) throw new Error('No hay institución')

  const gestion = await prisma.gestion.findFirst({ where: { institucion_id: inst.id, activa: true } })
  if (!gestion) throw new Error('No hay gestión activa')

  const matriculas = await prisma.matricula.findMany({
    where: {
      gestion_id: gestion.id,
      paralelo: { grado: { nivel: { nombre: 'SECUNDARIA' } } },
    },
    include: {
      estudiante: { include: { usuario: { select: { nombre: true, apellido: true, email: true } } } },
      paralelo:   { include: { grado: { include: { nivel: true } } } },
    },
    orderBy: [
      { paralelo: { grado: { orden: 'asc' } } },
      { paralelo: { letra: 'asc' } },
      { estudiante: { usuario: { apellido: 'asc' } } },
    ],
  })

  const rows = matriculas.map(m => ({
    estudiante_id: m.estudiante_id,
    usuario_id:    m.estudiante.usuario_id,
    nivel:         m.paralelo.grado.nivel.nombre,
    grado:         m.paralelo.grado.nombre,
    orden:         m.paralelo.grado.orden,
    letra:         m.paralelo.letra,
    paralelo_id:   m.paralelo_id,
    apellido:      m.estudiante.usuario.apellido,
    nombre:        m.estudiante.usuario.nombre,
    codigo:        m.estudiante.codigo,
    email:         m.estudiante.usuario.email,
    estado:        m.estudiante.estado,
  }))

  writeFileSync('roster-secundaria-2026.json', JSON.stringify(rows, null, 2))
  console.log(`Gestión activa: ${gestion.anno}`)
  console.log(`Total matriculados Secundaria (todos los estados): ${rows.length}`)

  const porCurso = new Map<string, number>()
  const porEstado = new Map<string, number>()
  for (const r of rows) {
    const key = `${r.grado} "${r.letra}"`
    porCurso.set(key, (porCurso.get(key) ?? 0) + 1)
    porEstado.set(r.estado, (porEstado.get(r.estado) ?? 0) + 1)
  }
  for (const [k, v] of [...porCurso.entries()].sort()) console.log(`  ${k}: ${v}`)
  console.log('Por estado:')
  for (const [k, v] of porEstado) console.log(`  ${k}: ${v}`)
}

main().finally(() => prisma.$disconnect())
