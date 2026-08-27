const AZUL = '#1F3864'

type Escala = 'ED' | 'DA' | 'DO' | 'DP'

export interface DatosRegistroMateria {
  materia:   string
  campo:     string
  nivel:     string
  grado:     string
  paralelo:  string
  anno:      number
  docente:   string
  trimestre: number
  dimensiones: Array<{
    id:          string
    nombre:      string
    puntaje_max: number
    indicadores: Array<{ id: string; nombre: string }>
  }>
  estudiantes: Array<{
    nombre:    string
    apellido:  string
    codigo:    string
    notas:     Record<string, number | null>
    promedios: Record<string, number | null>
    total:     number | null
    escala:    Escala | null
  }>
}

const ESCALA_COLOR: Record<Escala, string> = {
  ED: '#dc2626', DA: '#d97706', DO: '#2563eb', DP: '#16a34a',
}

export function generarHTMLRegistroMateria(d: DatosRegistroMateria): string {
  const totalIndicCols = d.dimensiones.reduce((s, dim) => s + dim.indicadores.length, 0)

  const groupHeader = d.dimensiones.map(dim =>
    `<th colspan="${dim.indicadores.length + 1}" style="background:${AZUL};color:#fff;padding:4px 2px;font-size:9px;text-align:center;">${dim.nombre} <span style="font-weight:normal;">/ ${dim.puntaje_max}pts</span></th>`
  ).join('')

  const indicHeader = d.dimensiones.map(dim => {
    const cols = dim.indicadores.map(ind =>
      `<th style="background:#E8EBF0;padding:3px 1px;font-size:7px;max-width:36px;overflow:hidden;writing-mode:vertical-rl;transform:rotate(180deg);height:65px;">${ind.nombre}</th>`
    ).join('')
    return `${cols}<th style="background:#D6DCE5;color:${AZUL};padding:3px;font-size:8px;font-weight:bold;">PROM.</th>`
  }).join('')

  const filas = d.estudiantes.map((est, idx) => {
    const bg = idx % 2 === 0 ? '#FFFFFF' : '#F5F5F5'
    const dimCells = d.dimensiones.map(dim => {
      const notaCells = dim.indicadores.map(ind =>
        `<td style="text-align:center;font-size:8px;padding:2px;">${est.notas[ind.id] ?? '—'}</td>`
      ).join('')
      const prom = est.promedios[dim.id]
      return `${notaCells}<td style="text-align:center;font-size:8px;padding:2px;font-weight:bold;background:#F0F2F5;">${prom ?? '—'}</td>`
    }).join('')
    const escalaColor = est.escala ? ESCALA_COLOR[est.escala] : '#999'
    return `<tr style="background:${bg};">
      <td style="text-align:center;font-size:8px;padding:2px;">${idx + 1}</td>
      <td style="font-size:8px;padding:2px 4px;">${est.apellido} ${est.nombre}</td>
      ${dimCells}
      <td style="text-align:center;font-size:9px;padding:2px;font-weight:bold;">${est.total ?? '—'}</td>
      <td style="text-align:center;font-size:9px;padding:2px;font-weight:bold;color:${escalaColor};">${est.escala ?? '—'}</td>
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
  <div style="font-size:13px;font-weight:bold;color:${AZUL};">REGISTRO DE CALIFICACIONES</div>
  <div style="font-size:10px;color:#444;">
    ${d.materia} (${d.campo}) | ${d.nivel} – ${d.grado} "${d.paralelo}" | Trimestre ${d.trimestre}° | Gestión ${d.anno}
  </div>
  <div style="font-size:9px;color:#666;">Prof. ${d.docente}</div>
</div>
<table>
  <thead>
    <tr>
      <th rowspan="2" style="background:${AZUL};color:#fff;padding:4px;font-size:9px;width:24px;">N°</th>
      <th rowspan="2" style="background:${AZUL};color:#fff;padding:4px;font-size:9px;min-width:120px;text-align:left;">Apellidos y Nombres</th>
      ${groupHeader}
      <th rowspan="2" style="background:#111827;color:#fff;padding:4px;font-size:9px;width:36px;">Total</th>
      <th rowspan="2" style="background:#111827;color:#fff;padding:4px;font-size:9px;width:36px;">Escala</th>
    </tr>
    <tr>
      ${indicHeader}
    </tr>
  </thead>
  <tbody>
    ${filas}
    ${d.estudiantes.length === 0 ? `<tr><td colspan="${4 + totalIndicCols + d.dimensiones.length}" style="text-align:center;padding:10px;font-size:9px;color:#999;">Sin estudiantes matriculados</td></tr>` : ''}
  </tbody>
</table>
<div style="margin-top:8px;font-size:8px;color:#999;text-align:center;">
  Escala: ED(0-50) | DA(51-68) | DO(69-84) | DP(85-100)
</div>
</body>
</html>`
}
