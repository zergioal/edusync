import type { Escala } from '../services/calculo.service'

const AZUL    = '#1F3864'
const AZUL_CL = '#2E5EA8'

function escalaColor(e: Escala): string {
  if (e === 'ED') return '#dc2626'
  if (e === 'DA') return '#ea580c'
  if (e === 'DO') return '#16a34a'
  return '#15803d'
}

interface BoletinBase {
  institucion:  { nombre: string; logo_url: string | null; direccion: string | null }
  estudiante:   { nombre: string; apellido: string; codigo: string; paralelo: string; grado: string; nivel: string; docente_asesor: string | null }
  gestion:      { anno: number }
  trimestre:    { numero: number; fecha_inicio: Date; fecha_fin: Date }
  total_asistencias: number
  total_faltas:      number
  total_tardanzas:   number
}

export interface DatosBoletinRegular extends BoletinBase {
  tipo: 'REGULAR'
  dimensiones:  Array<{ nombre: string; puntaje_max: number; key: string }>
  materias:     Array<{ nombre: string; campo: string; ser: number; saber: number; hacer: number; autoevaluacion: number; total: number; escala: Escala; observacion: string | null }>
  promedio_general: number
  escala_general:   Escala
}

export interface DatosBoletinInicial extends BoletinBase {
  tipo: 'INICIAL'
  materias_inicial: Array<{ nombre: string; docente: string; observacion: string | null }>
}

export type DatosBoletin = DatosBoletinRegular | DatosBoletinInicial

export function generarHTMLBoletin(d: DatosBoletin): string {
  if (d.tipo === 'INICIAL') return generarHTMLBoletinInicial(d)
  return generarHTMLBoletinRegular(d)
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

const fmt = (date: Date) =>
  new Date(date).toLocaleDateString('es-BO', { day: '2-digit', month: 'long', year: 'numeric' })

function headerHTML(d: BoletinBase, subtitulo: string): string {
  return `
<table class="no-border" style="margin-bottom:8px;">
  <tr>
    <td style="width:80px;vertical-align:middle;">
      ${d.institucion.logo_url
        ? `<img src="${d.institucion.logo_url}" style="max-width:70px;max-height:70px;" />`
        : `<div style="width:70px;height:70px;background:#eee;text-align:center;padding-top:25px;font-size:9px;color:#999;">LOGO</div>`}
    </td>
    <td style="text-align:center;vertical-align:middle;">
      <div style="font-size:14px;font-weight:bold;color:${AZUL};">${d.institucion.nombre}</div>
      ${d.institucion.direccion ? `<div style="font-size:9px;color:#666;margin-top:2px;">${d.institucion.direccion}</div>` : ''}
      <div style="font-size:13px;font-weight:bold;color:${AZUL_CL};margin-top:4px;text-transform:uppercase;letter-spacing:1px;">${subtitulo}</div>
    </td>
    <td style="width:120px;text-align:right;vertical-align:middle;font-size:10px;color:#555;">
      <div>Gestión <strong>${d.gestion.anno}</strong></div>
      <div style="margin-top:2px;">Trimestre <strong>${d.trimestre.numero}°</strong></div>
      <div style="margin-top:2px;font-size:9px;">${fmt(d.trimestre.fecha_inicio)} –<br/>${fmt(d.trimestre.fecha_fin)}</div>
    </td>
  </tr>
</table>
<hr style="border:1.5px solid ${AZUL};margin-bottom:8px;"/>
<table class="no-border" style="margin-bottom:8px;font-size:10px;">
  <tr>
    <td style="width:50%;padding:2px 0;"><strong>Estudiante:</strong> ${d.estudiante.apellido} ${d.estudiante.nombre}</td>
    <td style="width:50%;padding:2px 0;"><strong>Código:</strong> ${d.estudiante.codigo}</td>
  </tr>
  <tr>
    <td style="padding:2px 0;">
      <strong>Nivel:</strong> ${d.estudiante.nivel} &nbsp;&nbsp;
      <strong>Grado:</strong> ${d.estudiante.grado} &nbsp;&nbsp;
      <strong>Paralelo:</strong> ${d.estudiante.paralelo}
    </td>
    <td style="padding:2px 0;"><strong>Doc. Asesor:</strong> ${d.estudiante.docente_asesor ?? '—'}</td>
  </tr>
</table>`
}

function asistenciaHTML(d: BoletinBase): string {
  return `
<table class="no-border" style="margin-bottom:10px;">
  <tr>
    <td style="font-weight:bold;font-size:10px;color:${AZUL};padding-bottom:4px;" colspan="3">Registro de Asistencia</td>
  </tr>
  <tr>
    <td style="width:33%;"><div style="border:1px solid #ccc;border-radius:4px;padding:6px;text-align:center;"><div style="font-size:18px;font-weight:bold;color:#16a34a;">${d.total_asistencias}</div><div style="font-size:9px;color:#555;">Presentes</div></div></td>
    <td style="width:33%;padding:0 4px;"><div style="border:1px solid #ccc;border-radius:4px;padding:6px;text-align:center;"><div style="font-size:18px;font-weight:bold;color:#ea580c;">${d.total_tardanzas}</div><div style="font-size:9px;color:#555;">Tardanzas</div></div></td>
    <td style="width:33%;"><div style="border:1px solid #ccc;border-radius:4px;padding:6px;text-align:center;"><div style="font-size:18px;font-weight:bold;color:#dc2626;">${d.total_faltas}</div><div style="font-size:9px;color:#555;">Faltas</div></div></td>
  </tr>
</table>`
}

function firmasHTML(d: BoletinBase): string {
  return `
<table class="no-border" style="margin-top:20px;">
  <tr>
    <td style="width:33%;text-align:center;font-size:10px;">
      <div style="border-top:1px solid #555;padding-top:4px;margin:0 10px;">
        <div style="font-weight:bold;">Docente Asesor</div>
        <div style="color:#555;margin-top:2px;">${d.estudiante.docente_asesor ?? '____________________'}</div>
      </div>
    </td>
    <td style="width:33%;text-align:center;font-size:10px;">
      <div style="border-top:1px solid #555;padding-top:4px;margin:0 10px;">
        <div style="font-weight:bold;">Director/a</div>
        <div style="color:#555;margin-top:2px;">____________________</div>
      </div>
    </td>
    <td style="width:33%;text-align:center;font-size:10px;">
      <div style="border:1px dashed #999;height:55px;margin:0 10px;text-align:center;padding-top:20px;">
        <div style="color:#aaa;font-size:9px;">SELLO INSTITUCIONAL</div>
      </div>
    </td>
  </tr>
</table>
<div style="margin-top:12px;text-align:center;font-size:8px;color:#999;border-top:1px solid #eee;padding-top:6px;">
  Este boletín es válido únicamente con sello institucional. | ${d.institucion.nombre} – Gestión ${d.gestion.anno}
</div>`
}

function htmlWrapper(body: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #1a1a1a; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #ccc; }
  .no-border th, .no-border td { border: none; }
  @page { size: Letter; margin: 1cm; }
</style>
</head>
<body>
${body}
</body>
</html>`
}

// ─── REGULAR template ─────────────────────────────────────────────────────────

function generarHTMLBoletinRegular(d: DatosBoletinRegular): string {
  const campos = [...new Set(d.materias.map(m => m.campo))]

  const dimHeaders = d.dimensiones.map(dim =>
    `<th style="background:${AZUL};color:#fff;padding:5px 3px;text-align:center;font-size:10px;white-space:nowrap;">
       ${dim.nombre}<br/><span style="font-weight:normal;font-size:9px;">(${dim.puntaje_max})</span>
     </th>`
  ).join('')

  let filas = ''
  campos.forEach(campo => {
    filas += `<tr><td colspan="${d.dimensiones.length + 3}" style="background:#DDEEFF;color:${AZUL};font-weight:bold;font-size:10px;padding:4px 8px;">${campo}</td></tr>`
    d.materias.filter(m => m.campo === campo).forEach((m, idx) => {
      const bg       = idx % 2 === 0 ? '#FFFFFF' : '#F5F5F5'
      const dimCells = d.dimensiones.map(dim => {
        const val = (m as Record<string, unknown>)[dim.key] as number
        return `<td style="text-align:center;padding:4px;font-size:10px;">${val}</td>`
      }).join('')
      filas += `
        <tr style="background:${bg};">
          <td style="padding:4px 8px;font-size:10px;">${m.nombre}</td>
          ${dimCells}
          <td style="text-align:center;padding:4px;font-weight:bold;font-size:10px;">${m.total}</td>
          <td style="text-align:center;padding:4px;font-size:10px;font-weight:bold;color:${escalaColor(m.escala)};">${m.escala}</td>
        </tr>`
    })
  })

  filas += `
    <tr style="background:#E8EBF0;font-weight:bold;">
      <td style="padding:5px 8px;font-size:10px;color:${AZUL};">PROMEDIO GENERAL</td>
      ${d.dimensiones.map(() => '<td></td>').join('')}
      <td style="text-align:center;padding:5px;font-size:11px;color:${AZUL};">${d.promedio_general}</td>
      <td style="text-align:center;padding:5px;font-size:11px;font-weight:bold;color:${escalaColor(d.escala_general)};">${d.escala_general}</td>
    </tr>`

  const body = `
${headerHTML(d, 'Boletín de Calificaciones')}

<table style="margin-bottom:10px;font-size:10px;">
  <thead>
    <tr>
      <th style="background:${AZUL};color:#fff;padding:6px 8px;text-align:left;font-size:10px;">Área / Materia</th>
      ${dimHeaders}
      <th style="background:${AZUL};color:#fff;padding:5px 3px;text-align:center;font-size:10px;white-space:nowrap;">TOTAL<br/><span style="font-weight:normal;font-size:9px;">(100)</span></th>
      <th style="background:${AZUL};color:#fff;padding:5px 3px;text-align:center;font-size:10px;">ESCALA</th>
    </tr>
  </thead>
  <tbody>${filas}</tbody>
</table>

${asistenciaHTML(d)}

<table class="no-border" style="margin-bottom:16px;">
  <tr>
    <td style="font-size:9px;color:#555;">
      <strong>Escala:</strong>
      &nbsp;<span style="color:#dc2626;font-weight:bold;">ED</span> En Desarrollo (0–50)
      &nbsp;<span style="color:#ea580c;font-weight:bold;">DA</span> En Desarrollo Avanzado (51–68)
      &nbsp;<span style="color:#16a34a;font-weight:bold;">DO</span> Óptimo (69–84)
      &nbsp;<span style="color:#15803d;font-weight:bold;">DP</span> Destacado (85–100)
    </td>
  </tr>
</table>

${firmasHTML(d)}`

  return htmlWrapper(body)
}

// ─── INICIAL template ─────────────────────────────────────────────────────────

function generarHTMLBoletinInicial(d: DatosBoletinInicial): string {
  const filas = d.materias_inicial.map((m, idx) => {
    const bg  = idx % 2 === 0 ? '#FFFFFF' : '#F5F5F5'
    const obs = m.observacion
      ? `<div style="background:#f0f9ff;border-left:3px solid ${AZUL_CL};padding:6px 8px;font-size:10px;color:#1e3a5f;">${m.observacion}</div>`
      : `<div style="font-size:10px;color:#aaa;font-style:italic;">Sin observación registrada.</div>`
    return `
      <tr style="background:${bg};">
        <td style="padding:8px;width:38%;vertical-align:top;">
          <div style="font-weight:bold;font-size:10px;">${m.nombre}</div>
          <div style="font-size:9px;color:#666;margin-top:2px;">Doc. ${m.docente}</div>
        </td>
        <td style="padding:8px;">${obs}</td>
      </tr>`
  }).join('')

  const body = `
${headerHTML(d, 'Informe de Desarrollo Integral')}

<div style="background:#FFF8E1;border:1px solid #F9A825;border-radius:4px;padding:6px 10px;margin-bottom:10px;font-size:9px;color:#5d4037;">
  <strong>Nivel Inicial – Evaluación Cualitativa (Ley 070):</strong>
  Las calificaciones son expresadas mediante observaciones descriptivas del proceso de desarrollo integral del niño/a.
</div>

<div style="font-weight:bold;font-size:11px;color:${AZUL};margin-bottom:6px;border-bottom:2px solid ${AZUL};padding-bottom:4px;">
  INFORME DE DESARROLLO POR ÁREA
</div>

<table style="margin-bottom:12px;font-size:10px;">
  <thead>
    <tr>
      <th style="background:${AZUL};color:#fff;padding:6px 8px;text-align:left;width:38%;">Área / Materia</th>
      <th style="background:${AZUL};color:#fff;padding:6px 8px;text-align:left;">Observación descriptiva</th>
    </tr>
  </thead>
  <tbody>${filas}</tbody>
</table>

${asistenciaHTML(d)}

${firmasHTML(d)}`

  return htmlWrapper(body)
}
