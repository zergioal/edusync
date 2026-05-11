import type { Escala } from '../services/calculo.service'

const AZUL = '#1F3864'

function escalaColor(e: Escala): string {
  if (e === 'ED') return '#dc2626'
  if (e === 'DA') return '#ea580c'
  if (e === 'DO') return '#16a34a'
  return '#15803d'
}

export interface DatosCuadroHonor {
  paralelo:  string
  grado:     string
  nivel:     string
  trimestre: number
  anno:      number
  materias:  Array<{ nombre: string }>
  estudiantes: Array<{
    posicion:          number
    nombre:            string
    apellido:          string
    codigo:            string
    promedios_materia: number[]
    promedio_general:  number
    escala_general:    Escala
    materias_reprobadas: number
  }>
}

const MEDAL = ['🥇', '🥈', '🥉']

export function generarHTMLCuadroHonor(d: DatosCuadroHonor): string {
  const headerMaterias = d.materias.map(m =>
    `<th style="background:${AZUL};color:#fff;padding:4px 2px;font-size:8px;text-align:center;writing-mode:vertical-rl;transform:rotate(180deg);height:60px;">${m.nombre}</th>`
  ).join('')

  const filas = d.estudiantes.map(est => {
    const medal = est.posicion <= 3 ? `${MEDAL[est.posicion - 1]} ` : ''
    const notaCells = est.promedios_materia.map(n =>
      `<td style="text-align:center;font-size:9px;padding:3px;${n <= 50 ? 'color:#dc2626;font-weight:bold;' : ''}">${n}</td>`
    ).join('')
    return `<tr style="background:${est.posicion % 2 === 0 ? '#F9F9F9' : '#FFF'};">
      <td style="text-align:center;font-size:11px;padding:4px;">${medal}${est.posicion}</td>
      <td style="font-size:10px;padding:4px 8px;">${est.apellido} ${est.nombre}</td>
      ${notaCells}
      <td style="text-align:center;font-size:11px;font-weight:bold;padding:4px;color:${escalaColor(est.escala_general)};">${est.promedio_general}</td>
      <td style="text-align:center;font-size:10px;font-weight:bold;padding:4px;color:${escalaColor(est.escala_general)};">${est.escala_general}</td>
    </tr>`
  }).join('')

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #ddd; }
  @page { size: Letter landscape; margin: 1cm; }
</style>
</head>
<body>
<div style="text-align:center;margin-bottom:12px;">
  <div style="font-size:22px;font-weight:bold;color:${AZUL};letter-spacing:2px;">⭐ CUADRO DE HONOR ⭐</div>
  <div style="font-size:11px;color:#555;margin-top:4px;">
    ${d.nivel} – ${d.grado} "${d.paralelo}" | Trimestre ${d.trimestre}° | Gestión ${d.anno}
  </div>
  <div style="font-size:10px;color:#888;margin-top:2px;">Ordenado por promedio general descendente</div>
</div>
<table>
  <thead>
    <tr>
      <th style="background:${AZUL};color:#fff;padding:5px;font-size:9px;width:40px;">Pos.</th>
      <th style="background:${AZUL};color:#fff;padding:5px;font-size:9px;text-align:left;min-width:140px;">Apellidos y Nombres</th>
      ${headerMaterias}
      <th style="background:${AZUL};color:#fff;padding:5px;font-size:9px;width:45px;">Prom.</th>
      <th style="background:${AZUL};color:#fff;padding:5px;font-size:9px;width:45px;">Escala</th>
    </tr>
  </thead>
  <tbody>${filas}</tbody>
</table>
<div style="margin-top:10px;font-size:8px;color:#888;text-align:center;">
  Escala: ED(0-50) | DA(51-68) | DO(69-84) | DP(85-100)
  &nbsp;&nbsp;🥇 1° lugar &nbsp;🥈 2° lugar &nbsp;🥉 3° lugar
</div>
</body>
</html>`
}
