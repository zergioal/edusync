const AZUL = '#1F3864'

type Escala = 'ED' | 'DA' | 'DO' | 'DP'

export interface DatosCentralizadorAsignacion {
  materia:   string
  nivel:     string
  grado:     string
  paralelo:  string
  anno:      number
  meta:      number
  trimestres:  Array<{ id: string; numero: number }>
  estudiantes: Array<{
    nombre:      string
    apellido:    string
    codigo:      string
    totales:     Record<string, number | null>
    escalas:     Record<string, Escala | null>
    observacion: string
  }>
}

const ESCALA_COLOR: Record<Escala, string> = {
  ED: '#dc2626', DA: '#d97706', DO: '#2563eb', DP: '#16a34a',
}

export function generarHTMLCentralizadorAsignacion(d: DatosCentralizadorAsignacion): string {
  const headerCols = d.trimestres.map(t =>
    `<th style="background:${AZUL};color:#fff;padding:4px;font-size:9px;width:50px;">${t.numero}° Trim.</th>`
  ).join('')

  const filas = d.estudiantes.map((est, idx) => {
    const bg = idx % 2 === 0 ? '#FFFFFF' : '#F5F5F5'
    const cells = d.trimestres.map(t => {
      const total  = est.totales[t.id] ?? null
      const escala = est.escalas[t.id] ?? null
      const color  = escala ? ESCALA_COLOR[escala] : '#999'
      return `<td style="text-align:center;font-size:9px;padding:3px;font-weight:bold;color:${color};">${total ?? '—'}</td>`
    }).join('')
    return `<tr style="background:${bg};">
      <td style="text-align:center;font-size:9px;padding:3px;">${idx + 1}</td>
      <td style="font-size:9px;padding:3px;">${est.apellido} ${est.nombre}</td>
      ${cells}
      <td style="font-size:8px;padding:3px;color:#444;">${est.observacion}</td>
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
  <div style="font-size:13px;font-weight:bold;color:${AZUL};">CENTRALIZADOR DE LA MATERIA</div>
  <div style="font-size:10px;color:#444;">
    ${d.materia} | ${d.nivel} – ${d.grado} "${d.paralelo}" | Gestión ${d.anno}
  </div>
</div>
<table>
  <thead>
    <tr>
      <th style="background:${AZUL};color:#fff;padding:4px;font-size:9px;width:28px;">N°</th>
      <th style="background:${AZUL};color:#fff;padding:4px;font-size:9px;min-width:130px;text-align:left;">Apellidos y Nombres</th>
      ${headerCols}
      <th style="background:${AZUL};color:#fff;padding:4px;font-size:9px;min-width:160px;">Observaciones</th>
    </tr>
  </thead>
  <tbody>
    ${filas}
    ${d.estudiantes.length === 0 ? `<tr><td colspan="${3 + d.trimestres.length}" style="text-align:center;padding:10px;font-size:9px;color:#999;">Sin estudiantes matriculados</td></tr>` : ''}
  </tbody>
</table>
<div style="margin-top:8px;font-size:8px;color:#999;text-align:center;">
  Mínimo para aprobar la gestión: ${d.meta} pts acumulados en los ${d.trimestres.length} trimestres.
</div>
</body>
</html>`
}
