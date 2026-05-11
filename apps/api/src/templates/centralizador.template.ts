const AZUL = '#1F3864'

export interface DatosCentralizador {
  paralelo:  string
  grado:     string
  nivel:     string
  trimestre: number
  anno:      number
  materias:  Array<{ id: string; nombre: string; campo: string }>
  estudiantes: Array<{
    nombre:   string
    apellido: string
    codigo:   string
    notas:    Record<string, { total: number | null }>
    promedio: number | null
  }>
}

export function generarHTMLCentralizador(d: DatosCentralizador): string {
  const headerCols = d.materias.map(m =>
    `<th style="background:${AZUL};color:#fff;padding:4px 2px;font-size:8px;text-align:center;max-width:40px;white-space:nowrap;overflow:hidden;writing-mode:vertical-rl;transform:rotate(180deg);height:70px;">${m.nombre}</th>`
  ).join('')

  const avgRow = (() => {
    const avgs = d.materias.map(m => {
      const vals = d.estudiantes.map(e => e.notas[m.id]?.total ?? null).filter((v): v is number => v !== null)
      if (vals.length === 0) return null
      return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
    })
    const cells = avgs.map(v =>
      `<td style="text-align:center;font-size:9px;font-weight:bold;padding:3px;">${v ?? '—'}</td>`
    ).join('')
    const promAvg = avgs.filter((v): v is number => v !== null)
    const prom = promAvg.length ? Math.round(promAvg.reduce((a, b) => a + b, 0) / promAvg.length) : null
    return `<tr style="background:#E8EBF0;font-weight:bold;">
      <td style="font-size:9px;padding:3px;">—</td>
      <td style="font-size:9px;padding:3px;color:${AZUL};">PROMEDIO DEL CURSO</td>
      ${cells}
      <td style="text-align:center;font-size:9px;font-weight:bold;padding:3px;color:${AZUL};">${prom ?? '—'}</td>
    </tr>`
  })()

  const filas = d.estudiantes.map((est, idx) => {
    const bg = idx % 2 === 0 ? '#FFFFFF' : '#F5F5F5'
    const notaCells = d.materias.map(m => {
      const total = est.notas[m.id]?.total ?? null
      const color = total !== null && total <= 50 ? 'color:#dc2626;font-weight:bold;background:#FEE2E2;' : ''
      return `<td style="text-align:center;font-size:9px;padding:3px;${color}">${total ?? '—'}</td>`
    }).join('')
    return `<tr style="background:${bg};">
      <td style="text-align:center;font-size:9px;padding:3px;">${idx + 1}</td>
      <td style="font-size:9px;padding:3px;">${est.apellido} ${est.nombre}</td>
      ${notaCells}
      <td style="text-align:center;font-size:9px;padding:3px;font-weight:bold;">${est.promedio ?? '—'}</td>
    </tr>`
  }).join('')

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 10px; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #ddd; }
  @page { size: Letter landscape; margin: 0.7cm; }
</style>
</head>
<body>
<div style="text-align:center;margin-bottom:6px;">
  <div style="font-size:13px;font-weight:bold;color:${AZUL};">CENTRALIZADOR DE CALIFICACIONES</div>
  <div style="font-size:10px;color:#444;">
    ${d.nivel} – ${d.grado} "${d.paralelo}" | Trimestre ${d.trimestre}° | Gestión ${d.anno}
  </div>
</div>
<table>
  <thead>
    <tr>
      <th style="background:${AZUL};color:#fff;padding:4px;font-size:9px;width:28px;">N°</th>
      <th style="background:${AZUL};color:#fff;padding:4px;font-size:9px;min-width:130px;text-align:left;">Apellidos y Nombres</th>
      ${headerCols}
      <th style="background:${AZUL};color:#fff;padding:4px;font-size:9px;width:40px;">Prom.</th>
    </tr>
  </thead>
  <tbody>
    ${filas}
    ${avgRow}
  </tbody>
</table>
<div style="margin-top:8px;font-size:8px;color:#999;text-align:center;">
  Notas en rojo indican calificación ED (≤50). Escala: ED(0-50) | DA(51-68) | DO(69-84) | DP(85-100)
</div>
</body>
</html>`
}
