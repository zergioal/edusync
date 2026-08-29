import type { InstitucionInfo } from '../utils/institucion.util'

export type { InstitucionInfo }

/**
 * Envuelve el bloque de título centrado (contenidoCentroHTML) en un encabezado de
 * 3 columnas: logo de la institución a la izquierda, título centrado, columna
 * vacía a la derecha (mismo ancho que el logo) para que el título quede
 * realmente centrado. Si no hay logo, la columna izquierda queda vacía.
 */
export function encabezadoConLogo(institucion: InstitucionInfo | undefined, contenidoCentroHTML: string): string {
  const logo = institucion?.logo_url
    ? `<img src="${institucion.logo_url}" style="max-width:56px;max-height:56px;object-fit:contain;" />`
    : ''

  return `<table style="width:100%;border:none;border-collapse:collapse;margin-bottom:8px;">
  <tr>
    <td style="width:64px;border:none;padding:0;vertical-align:middle;">${logo}</td>
    <td style="border:none;padding:0;vertical-align:middle;text-align:center;">${contenidoCentroHTML}</td>
    <td style="width:64px;border:none;padding:0;"></td>
  </tr>
</table>`
}
