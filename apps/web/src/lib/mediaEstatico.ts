// Carga automática de los archivos que el colegio copia en:
//   src/assets/carousel/  → carrusel grande de la página de inicio
//   src/assets/galeria/   → galería de fotos/videos
//
// No hace falta tocar este archivo al agregar o quitar fotos: Vite
// descubre los archivos en tiempo de build/dev con import.meta.glob.

export interface MediaItem {
  id:          string
  url:         string
  tipo:        'FOTO' | 'VIDEO'
  descripcion: string | null
}

const EXT_VIDEO = /\.(mp4|webm|mov)$/i

function nombreLegible(archivo: string): string | null {
  const base = archivo.replace(/\.[^.]+$/, '').replace(/^\d+[-_.\s]*/, '').replace(/[-_]+/g, ' ').trim()
  return base.length > 0 ? base : null
}

function construir(modules: Record<string, string>): MediaItem[] {
  return Object.entries(modules)
    .sort(([a], [b]) => a.localeCompare(b, 'es', { numeric: true }))
    .map(([path, url]) => {
      const archivo = path.split('/').pop() ?? path
      return {
        id:          path,
        url,
        tipo:        EXT_VIDEO.test(archivo) ? 'VIDEO' : 'FOTO',
        descripcion: nombreLegible(archivo),
      } satisfies MediaItem
    })
}

const carouselModules = import.meta.glob(
  '../assets/carousel/*.{mp4,MP4,webm,WEBM,mov,MOV,jpg,JPG,jpeg,JPEG,png,PNG,webp,WEBP}',
  { eager: true, query: '?url', import: 'default' },
) as Record<string, string>

const galeriaModules = import.meta.glob(
  '../assets/galeria/*.{mp4,MP4,webm,WEBM,mov,MOV,jpg,JPG,jpeg,JPEG,png,PNG,webp,WEBP}',
  { eager: true, query: '?url', import: 'default' },
) as Record<string, string>

const portadaModules = import.meta.glob(
  '../assets/portada/*.{mp4,MP4,webm,WEBM,mov,MOV}',
  { eager: true, query: '?url', import: 'default' },
) as Record<string, string>

/** Contenido de src/assets/carousel, en orden — para el carrusel grande del hero. */
export const carouselItems: MediaItem[] = construir(carouselModules)

/** Contenido de src/assets/galeria, en orden — para la sección/página de Galería. */
export const galeriaEstatica: MediaItem[] = construir(galeriaModules)

/** Video horizontal de src/assets/portada (el primero, si hay varios) — banner de portada. */
export const portadaVideo: string | null = construir(portadaModules)[0]?.url ?? null
