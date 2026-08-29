import { encabezadoConLogo, type InstitucionInfo } from './_header'

const AZUL = '#1F3864'

export interface ColumnaTabla { header: string; key: string; align?: 'left' | 'center' }

export interface DatosTablaSimple {
  titulo:    string
  subtitulo?: string
  columnas:  ColumnaTabla[]
  filas:     Record<string, string | number | null | undefined>[]
  /** Opcional: si se incluye, se dibuja el logo institucional arriba a la izquierda (solo PDF). */
  institucion?: InstitucionInfo
}

/** Genera una tabla simple (una fila por registro) con el estilo institucional ya usado en los demás reportes. */
export function generarHTMLTablaSimple(d: DatosTablaSimple): string {
  const headerCols = d.columnas.map(c =>
    `<th style="background:${AZUL};color:#fff;padding:5px 6px;font-size:9px;text-align:${c.align ?? 'left'};">${c.header}</th>`
  ).join('')

  const filas = d.filas.map((fila, idx) => {
    const bg = idx % 2 === 0 ? '#FFFFFF' : '#F5F5F5'
    const celdas = d.columnas.map(c =>
      `<td style="padding:4px 6px;font-size:9px;text-align:${c.align ?? 'left'};">${fila[c.key] ?? '—'}</td>`
    ).join('')
    return `<tr style="background:${bg};">${celdas}</tr>`
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
  <div style="font-size:13px;font-weight:bold;color:${AZUL};">${d.titulo}</div>
  ${d.subtitulo ? `<div style="font-size:10px;color:#444;">${d.subtitulo}</div>` : ''}
`)}
<table>
  <thead><tr>${headerCols}</tr></thead>
  <tbody>
    ${filas || `<tr><td colspan="${d.columnas.length}" style="text-align:center;padding:10px;color:#999;">Sin registros</td></tr>`}
  </tbody>
</table>
<div style="margin-top:8px;font-size:8px;color:#999;text-align:right;">
  Generado el ${new Date().toLocaleDateString('es-BO', { day: '2-digit', month: 'long', year: 'numeric' })}
</div>
</body>
</html>`
}
