import type { InstitucionInfo } from '../utils/institucion.util'
import { LOGO_UE_DEFAULT_DATA_URI } from '../assets/logo-ue.data'

export type { InstitucionInfo }

/**
 * Envuelve el bloque de título centrado (contenidoCentroHTML) en un encabezado de
 * 3 columnas: logo de la institución a la izquierda, título centrado, columna
 * vacía a la derecha (mismo ancho que el logo) para que el título quede
 * realmente centrado. Usa el logo propio de la institución (logo_url) si está
 * configurado; si no, cae al logo por defecto de la UE embebido en el sistema
 * — así todos los reportes siempre llevan un logo.
 */
export function encabezadoConLogo(institucion: InstitucionInfo | undefined, contenidoCentroHTML: string): string {
  const logoSrc = institucion?.logo_url || LOGO_UE_DEFAULT_DATA_URI
  const logo = `<img src="${logoSrc}" style="max-width:56px;max-height:56px;object-fit:contain;" />`

  return `<table style="width:100%;border:none;border-collapse:collapse;margin-bottom:8px;">
  <tr>
    <td style="width:64px;border:none;padding:0;vertical-align:middle;">${logo}</td>
    <td style="border:none;padding:0;vertical-align:middle;text-align:center;">${contenidoCentroHTML}</td>
    <td style="width:64px;border:none;padding:0;"></td>
  </tr>
</table>`
}
