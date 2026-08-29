import { prisma } from '@edusync/database'

export interface InstitucionInfo {
  nombre:   string
  logo_url: string | null
}

/** Datos mínimos de la institución para el encabezado de los reportes (nombre + logo). */
export async function getInstitucionInfo(institucion_id: string): Promise<InstitucionInfo> {
  const institucion = await prisma.institucion.findUnique({
    where:  { id: institucion_id },
    select: { nombre: true, logo_url: true },
  })
  return { nombre: institucion?.nombre ?? '', logo_url: institucion?.logo_url ?? null }
}
