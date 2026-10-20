import { encabezadoConLogo, type InstitucionInfo } from './_header'

const AZUL = '#1F3864'

export interface DatosCentralizadorSubareas {
  institucion?: InstitucionInfo
  area_padre:  string
  nivel:       string
  grado:       string
  paralelo:    string
  anno:        number
  trimestre:   number
  subareas:    Array<{ asignacion_id: string; nombre: string; docente: string }>
  estudiantes: Array<{
    codigo:        string
    nombre:        string
    apellido:      string
    notasSubareas: Array<{ asignacion_id: string; total: number | null }>
    promedio:      number | null
  }>
}

export function generarHTMLCentralizadorSubareas(d: DatosCentralizadorSubareas): string {
  const headerCols = d.subareas.map(s =>
    `<th style="background:${AZUL};color:#fff;padding:4px 2px;font-size:8px;">${s.nombre}<br/><span style="font-weight:normal;opacity:.8;">${s.docente}</span></th>`
  ).join('')

  const filas = d.estudiantes.map((est, idx) => {
    const bg = idx % 2 === 0 ? '#FFFFFF' : '#F5F5F5'
    const cells = est.notasSubareas.map(n =>
      `<td style="text-align:center;font-size:9px;padding:3px;">${n.total ?? '—'}</td>`
    ).join('')
    return `<tr style="background:${bg};">
      <td style="text-align:center;font-size:9px;padding:3px;">${idx + 1}</td>
      <td style="font-size:9px;padding:3px;">${est.apellido} ${est.nombre}</td>
      ${cells}
      <td style="text-align:center;font-size:9px;padding:3px;font-weight:bold;background:#EEF0FF;">${est.promedio ?? '—'}</td>
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
${encabezadoConLogo(d.institucion, `
  <div style="font-size:13px;font-weight:bold;color:${AZUL};">CENTRALIZADOR DE SUBÁREAS — ${d.area_padre.toUpperCase()}</div>
  <div style="font-size:10px;color:#444;">
    ${d.nivel} – ${d.grado} "${d.paralelo}" | Trimestre ${d.trimestre}° | Gestión ${d.anno}
  </div>
`)}
<table>
  <thead>
    <tr>
      <th style="background:${AZUL};color:#fff;padding:4px;font-size:9px;width:28px;">N°</th>
      <th style="background:${AZUL};color:#fff;padding:4px;font-size:9px;min-width:130px;text-align:left;">Apellidos y Nombres</th>
      ${headerCols}
      <th style="background:${AZUL};color:#fff;padding:4px;font-size:9px;width:70px;">Promedio<br/>combinado</th>
    </tr>
  </thead>
  <tbody>
    ${filas}
    ${d.estudiantes.length === 0 ? `<tr><td colspan="${3 + d.subareas.length}" style="text-align:center;padding:10px;font-size:9px;color:#999;">Sin estudiantes matriculados</td></tr>` : ''}
  </tbody>
</table>
<div style="margin-top:8px;font-size:8px;color:#999;text-align:center;">
  El promedio combinado es el que repercute en el boletín del estudiante como nota de "${d.area_padre}".
</div>
</body>
</html>`
}
