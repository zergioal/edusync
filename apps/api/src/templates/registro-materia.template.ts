import { encabezadoConLogo, type InstitucionInfo } from './_header'

const AZUL = '#1F3864'

type Escala = 'ED' | 'DA' | 'DO' | 'DP'

export interface DatosRegistroMateria {
  institucion?: InstitucionInfo
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
    notaExtracurricular: number | null
    total:     number | null
    escala:    Escala | null
  }>
}

const ESCALA_COLOR: Record<Escala, string> = {
  ED: '#dc2626', DA: '#d97706', DO: '#2563eb', DP: '#16a34a',
}
/** Mismo criterio de aprobación que el resto del sistema: > 50 aprueba. */
const colorTotal = (total: number | null) => total == null ? '#fff' : total > 50 ? '#e2f5e9' : '#fde7e7'

/** Un color por dimensión — mismo azul/verde/ámbar/morado que ya usa la planilla del docente en
 *  la web y el Excel exportado, para que todo el registro (web, PDF, Excel) se vea como un todo. */
const DIM_COLORS = [
  { oscuro: '#2563EB', claro: '#DBEAFE' }, // azul   (Ser/Decidir)
  { oscuro: '#059669', claro: '#D1FAE5' }, // verde  (Saber)
  { oscuro: '#D97706', claro: '#FEF3C7' }, // ámbar  (Hacer)
  { oscuro: '#9333EA', claro: '#F3E8FF' }, // morado (Autoevaluación)
]
const colorDimension = (i: number) => DIM_COLORS[i % DIM_COLORS.length]!

export function generarHTMLRegistroMateria(d: DatosRegistroMateria): string {
  const totalIndicCols = d.dimensiones.reduce((s, dim) => s + dim.indicadores.length, 0)
  // Columnas de datos = una por indicador + una "PROM." por dimensión.
  const totalDataCols = totalIndicCols + d.dimensiones.length

  // Anchos fijos para las columnas que no crecen con la cantidad de indicadores;
  // el resto se reparte en partes iguales entre las columnas de datos — así, con
  // muchos indicadores, cada columna se angosta de forma pareja en vez de que
  // "Apellidos y Nombres" les quite espacio (antes competían por ancho libre).
  const PCT_NRO = 3, PCT_NOMBRE = 15, PCT_EXTRA = 5, PCT_TOTAL = 5, PCT_ESCALA = 5
  const pctDatos = totalDataCols > 0 ? (100 - PCT_NRO - PCT_NOMBRE - PCT_EXTRA - PCT_TOTAL - PCT_ESCALA) / totalDataCols : 0
  const colgroup = `<colgroup>
    <col style="width:${PCT_NRO}%">
    <col style="width:${PCT_NOMBRE}%">
    ${Array(totalDataCols).fill(0).map(() => `<col style="width:${pctDatos.toFixed(3)}%">`).join('')}
    <col style="width:${PCT_EXTRA}%">
    <col style="width:${PCT_TOTAL}%">
    <col style="width:${PCT_ESCALA}%">
  </colgroup>`

  const groupHeader = d.dimensiones.map((dim, i) =>
    `<th colspan="${dim.indicadores.length + 1}" style="background:${colorDimension(i).oscuro};color:#fff;padding:4px 2px;font-size:9px;text-align:center;">${dim.nombre} <span style="font-weight:normal;">/ ${dim.puntaje_max}pts</span></th>`
  ).join('')

  const indicHeader = d.dimensiones.map((dim, i) => {
    const { oscuro, claro } = colorDimension(i)
    const cols = dim.indicadores.map(ind =>
      `<th style="background:${claro};color:#374151;padding:3px 1px;font-size:7px;overflow:hidden;word-break:break-word;writing-mode:vertical-rl;transform:rotate(180deg);height:70px;">${ind.nombre}</th>`
    ).join('')
    return `${cols}<th style="background:${oscuro};color:#fff;padding:3px;font-size:8px;font-weight:bold;">PROM.</th>`
  }).join('')

  const filas = d.estudiantes.map((est, idx) => {
    const bg = idx % 2 === 0 ? '#FFFFFF' : '#F5F5F5'
    const dimCells = d.dimensiones.map((dim, i) => {
      const notaCells = dim.indicadores.map(ind =>
        `<td style="text-align:center;font-size:8px;padding:2px;">${est.notas[ind.id] ?? '—'}</td>`
      ).join('')
      const prom = est.promedios[dim.id]
      return `${notaCells}<td style="text-align:center;font-size:8px;padding:2px;font-weight:bold;background:${colorDimension(i).claro};">${prom ?? '—'}</td>`
    }).join('')
    const escalaColor = est.escala ? ESCALA_COLOR[est.escala] : '#999'
    return `<tr style="background:${bg};">
      <td style="text-align:center;font-size:8px;padding:2px;">${idx + 1}</td>
      <td style="font-size:8px;padding:2px 4px;">${est.apellido} ${est.nombre}</td>
      ${dimCells}
      <td style="text-align:center;font-size:8px;padding:2px;color:#444;">${est.notaExtracurricular ?? '—'}</td>
      <td style="text-align:center;font-size:9px;padding:2px;font-weight:bold;background:${colorTotal(est.total)};">${est.total ?? '—'}</td>
      <td style="text-align:center;font-size:9px;padding:2px;font-weight:bold;color:${escalaColor};">${est.escala ?? '—'}</td>
    </tr>`
  }).join('')

  // ── Resumen de aprobados/reprobados (estático — este PDF es una foto del momento) ──────────
  const conNota = d.estudiantes.filter(e => e.total != null)
  const aprobados = conNota.filter(e => e.total! > 50).length
  const reprobados = conNota.length - aprobados
  const pctAprobados = conNota.length > 0 ? Math.round((aprobados / conNota.length) * 100) : 0
  const pctReprobados = conNota.length > 0 ? Math.round((reprobados / conNota.length) * 100) : 0
  const avisoReprobados = pctReprobados > 30

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 10px; }
  table { border-collapse: collapse; width: 100%; table-layout: fixed; }
  th, td { border: 1px solid #ddd; word-wrap: break-word; overflow-wrap: break-word; }
  @page { size: Letter landscape; margin: 0.7cm; }
</style>
</head>
<body>
${encabezadoConLogo(d.institucion, `
  <div style="font-size:13px;font-weight:bold;color:${AZUL};">REGISTRO DE CALIFICACIONES</div>
  <div style="font-size:10px;color:#444;">
    ${d.materia} (${d.campo}) | ${d.nivel} – ${d.grado} "${d.paralelo}" | Trimestre ${d.trimestre}° | Gestión ${d.anno}
  </div>
  <div style="font-size:9px;color:#666;">Prof. ${d.docente}</div>
`)}
<table>
  ${colgroup}
  <thead>
    <tr>
      <th rowspan="2" style="background:${AZUL};color:#fff;padding:4px;font-size:9px;">N°</th>
      <th rowspan="2" style="background:${AZUL};color:#fff;padding:4px;font-size:9px;text-align:left;">Apellidos y Nombres</th>
      ${groupHeader}
      <th rowspan="2" style="background:#4338CA;color:#fff;padding:4px;font-size:8px;">Nota<br/>Extra</th>
      <th rowspan="2" style="background:#111827;color:#fff;padding:4px;font-size:9px;">Total</th>
      <th rowspan="2" style="background:#111827;color:#fff;padding:4px;font-size:9px;">Escala</th>
    </tr>
    <tr>
      ${indicHeader}
    </tr>
  </thead>
  <tbody>
    ${filas}
    ${d.estudiantes.length === 0 ? `<tr><td colspan="${5 + totalIndicCols + d.dimensiones.length}" style="text-align:center;padding:10px;font-size:9px;color:#999;">Sin estudiantes matriculados</td></tr>` : ''}
  </tbody>
</table>
<div style="margin-top:8px;font-size:8px;color:#999;text-align:center;">
  Escala: ED(0-50) | DA(51-68) | DO(69-84) | DP(85-100)
</div>

<div style="margin-top:10px;display:flex;justify-content:flex-end;">
  <div style="width:230px;border:1px solid #ddd;border-radius:4px;padding:6px 10px;">
    <div style="font-weight:bold;color:${AZUL};font-size:10px;margin-bottom:4px;">Resumen del trimestre</div>
    <div style="display:flex;justify-content:space-between;font-size:9px;padding:1px 0;">
      <span>Aprobados (&gt; 50)</span><span style="font-weight:bold;color:#15803D;">${aprobados} (${pctAprobados}%)</span>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:9px;padding:1px 0;">
      <span>Reprobados (&le; 50)</span><span style="font-weight:bold;color:#B91C1C;">${reprobados} (${pctReprobados}%)</span>
    </div>
    <div style="font-size:7px;color:#666;margin-top:2px;">${conNota.length} de ${d.estudiantes.length} estudiante(s) con nota registrada.</div>
    ${avisoReprobados ? `<div style="margin-top:4px;background:#FDE7E7;color:#B91C1C;font-weight:bold;font-size:8px;padding:4px;border-radius:3px;">Aviso: más del 30% de los estudiantes está reprobando este trimestre (${pctReprobados}%).</div>` : ''}
  </div>
</div>

<div style="margin-top:34px;display:flex;justify-content:center;gap:70px;">
  <div style="width:210px;text-align:center;">
    <div style="border-top:1px solid #333;margin-bottom:4px;">&nbsp;</div>
    <div style="font-size:9px;color:#444;">Firma y Sello Profesor(a)</div>
  </div>
  <div style="width:210px;text-align:center;">
    <div style="border-top:1px solid #333;margin-bottom:4px;">&nbsp;</div>
    <div style="font-size:9px;color:#444;">Firma y Sello Director(a)</div>
  </div>
</div>
</body>
</html>`
}
