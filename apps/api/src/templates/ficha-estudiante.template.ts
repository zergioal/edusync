import { encabezadoConLogo, type InstitucionInfo } from './_header'

const AZUL = '#1F3864'

export interface DatosFichaEstudiante {
  institucion?: InstitucionInfo
  datos_personales: {
    nombre: string; apellido: string; email: string; telefono: string | null
    codigo: string; fecha_nacimiento: Date | string | null; sexo: string | null
    becado: boolean; motivo_beca: string | null
    estado: string; estado_motivo: string | null; estado_fecha: Date | string | null
  }
  matriculas: Array<{
    anno: number; nivel: string; grado: string; paralelo: string
    resultado: string; lleva_tecnica: boolean
  }>
  tutores: Array<{ nombre: string; apellido: string; email: string; telefono: string | null }>
}

function fmtFecha(f: Date | string | null): string {
  if (!f) return '—'
  return new Date(f).toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function fila(label: string, valor: string): string {
  return `<tr><td style="padding:4px 8px;font-size:9px;color:#666;width:35%;">${label}</td><td style="padding:4px 8px;font-size:10px;font-weight:bold;">${valor}</td></tr>`
}

export function generarHTMLFichaEstudiante(d: DatosFichaEstudiante): string {
  const p = d.datos_personales
  const matriculaActual = d.matriculas[0]

  const filasMatriculas = d.matriculas.map(m =>
    `<tr><td style="padding:4px;font-size:9px;">${m.anno}</td><td style="padding:4px;font-size:9px;">${m.nivel}</td><td style="padding:4px;font-size:9px;">${m.grado}</td><td style="padding:4px;font-size:9px;text-align:center;">${m.paralelo}</td><td style="padding:4px;font-size:9px;text-align:center;">${m.resultado}</td></tr>`
  ).join('')

  const filasTutores = d.tutores.length > 0
    ? d.tutores.map(t =>
        `<tr><td style="padding:4px;font-size:9px;">${t.apellido} ${t.nombre}</td><td style="padding:4px;font-size:9px;">${t.email}</td><td style="padding:4px;font-size:9px;">${t.telefono ?? '—'}</td></tr>`
      ).join('')
    : `<tr><td colspan="3" style="padding:8px;font-size:9px;text-align:center;color:#999;">Sin tutores registrados</td></tr>`

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 10px; }
  table { border-collapse: collapse; width: 100%; margin-bottom: 14px; }
  td, th { border: 1px solid #ddd; }
  h2 { font-size: 11px; color: ${AZUL}; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
  @page { size: Letter portrait; margin: 1.2cm; }
</style>
</head>
<body>
${encabezadoConLogo(d.institucion, `
  <div style="font-size:15px;font-weight:bold;color:${AZUL};">FICHA INDIVIDUAL DEL ESTUDIANTE</div>
  <div style="font-size:10px;color:#444;margin-top:2px;">${p.apellido} ${p.nombre} — Código ${p.codigo}</div>
`)}

<h2>Datos personales</h2>
<table>
  ${fila('Nombre completo', `${p.apellido} ${p.nombre}`)}
  ${fila('Código', p.codigo)}
  ${fila('Correo electrónico', p.email)}
  ${fila('Teléfono', p.telefono ?? '—')}
  ${fila('Fecha de nacimiento', fmtFecha(p.fecha_nacimiento))}
  ${fila('Sexo', p.sexo === 'M' ? 'Masculino' : p.sexo === 'F' ? 'Femenino' : '—')}
  ${fila('Becado', p.becado ? `Sí${p.motivo_beca ? ' — ' + p.motivo_beca : ''}` : 'No')}
  ${fila('Estado', p.estado + (p.estado_motivo ? ` — ${p.estado_motivo}` : '') + (p.estado_fecha ? ` (${fmtFecha(p.estado_fecha)})` : ''))}
</table>

<h2>Datos académicos${matriculaActual ? ` — Gestión actual: ${matriculaActual.nivel} ${matriculaActual.grado} "${matriculaActual.paralelo}"` : ''}</h2>
<table>
  <thead><tr>
    <th style="background:${AZUL};color:#fff;padding:4px;font-size:9px;">Gestión</th>
    <th style="background:${AZUL};color:#fff;padding:4px;font-size:9px;">Nivel</th>
    <th style="background:${AZUL};color:#fff;padding:4px;font-size:9px;">Grado</th>
    <th style="background:${AZUL};color:#fff;padding:4px;font-size:9px;">Paralelo</th>
    <th style="background:${AZUL};color:#fff;padding:4px;font-size:9px;">Resultado</th>
  </tr></thead>
  <tbody>${filasMatriculas || `<tr><td colspan="5" style="text-align:center;padding:8px;color:#999;font-size:9px;">Sin matrículas registradas</td></tr>`}</tbody>
</table>

<h2>Padres / Tutores</h2>
<table>
  <thead><tr>
    <th style="background:${AZUL};color:#fff;padding:4px;font-size:9px;">Nombre</th>
    <th style="background:${AZUL};color:#fff;padding:4px;font-size:9px;">Correo</th>
    <th style="background:${AZUL};color:#fff;padding:4px;font-size:9px;">Teléfono</th>
  </tr></thead>
  <tbody>${filasTutores}</tbody>
</table>

<div style="margin-top:8px;font-size:8px;color:#999;text-align:right;">
  Generado el ${new Date().toLocaleDateString('es-BO', { day: '2-digit', month: 'long', year: 'numeric' })}
</div>
</body>
</html>`
}
