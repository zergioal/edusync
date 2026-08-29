/**
 * actualizar-tarifas-2026.ts — Fija el costo de pensión de la gestión activa:
 * Secundaria Bs 700, Primaria e Inicial Bs 600. También corrige el monto de
 * las pensiones ya generadas (creadas con la tarifa provisional de la demo)
 * para que reflejen el nuevo precio. Script de un solo uso.
 * Uso: npx tsx src/scripts/actualizar-tarifas-2026.ts  (desde apps/api)
 */

import 'dotenv/config'
import { prisma, type NivelNombre } from '@edusync/database'
import { TarifasService } from '../services/tarifas.service'

async function main() {
  const gestion = await prisma.gestion.findFirst({ where: { activa: true } })
  if (!gestion) throw new Error('No hay gestión activa')
  const institucion_id = gestion.institucion_id

  const niveles = await prisma.nivel.findMany({ where: { institucion_id } })
  const nivelIdPorNombre = new Map(niveles.map(n => [n.nombre, n.id]))

  const MONTOS: Record<NivelNombre, number> = { SECUNDARIA: 700, PRIMARIA: 600, INICIAL: 600 } as Record<NivelNombre, number>

  const items = (Object.entries(MONTOS) as [NivelNombre, number][])
    .map(([nombre, monto]) => ({ nivel_id: nivelIdPorNombre.get(nombre), monto, nombre }))
    .filter((x): x is { nivel_id: string; monto: number; nombre: NivelNombre } => !!x.nivel_id)

  const tarifasService = new TarifasService()
  const resultado = await tarifasService.upsertBatch(institucion_id, gestion.id, items.map(({ nivel_id, monto }) => ({ nivel_id, monto })))
  console.log('Tarifas actualizadas:')
  for (const r of resultado) console.log(`  ${r.nivel_nombre}: Bs ${r.monto}`)

  // Corregir el monto de pensiones ya generadas para que coincidan con la nueva tarifa
  let totalActualizadas = 0
  for (const item of items) {
    const r = await prisma.pension.updateMany({
      where: { gestion_id: gestion.id, nivel_id: item.nivel_id, monto: { not: item.monto } },
      data:  { monto: item.monto },
    })
    if (r.count > 0) console.log(`  Pensiones de ${item.nombre} corregidas a Bs ${item.monto}: ${r.count}`)
    totalActualizadas += r.count
  }
  console.log(`\nTotal de pensiones existentes corregidas: ${totalActualizadas}`)

  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
