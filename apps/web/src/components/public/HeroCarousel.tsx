import { useEffect, useRef, useState } from 'react'
import type { MediaItem } from '../../lib/mediaEstatico'

const DURACION_FOTO_MS = 5000

interface Props {
  items: MediaItem[]
}

export default function HeroCarousel({ items }: Props) {
  const [indice,    setIndice]    = useState(0)
  const [pausado,   setPausado]   = useState(false)
  const [conSonido, setConSonido] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  const actual = items[indice]

  const siguiente = () => setIndice(i => (i + 1) % items.length)
  const anterior  = () => setIndice(i => (i - 1 + items.length) % items.length)

  // Avance automático — las fotos avanzan solas; los videos avanzan al terminar (onEnded).
  useEffect(() => {
    if (!actual || pausado || actual.tipo === 'VIDEO') return
    const t = setTimeout(siguiente, DURACION_FOTO_MS)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indice, pausado, actual?.tipo])

  useEffect(() => {
    const v = videoRef.current
    if (v && actual?.tipo === 'VIDEO') {
      v.muted = !conSonido
      v.play().catch(() => {})
    }
  }, [indice, conSonido, actual?.tipo])

  if (items.length === 0) return null

  return (
    <div
      className="absolute inset-0 overflow-hidden bg-black"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
    >
      {items.map((item, i) => (
        <div
          key={item.id}
          className={`absolute inset-0 transition-opacity duration-700 ${i === indice ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        >
          {item.tipo === 'VIDEO' ? (
            <video
              ref={i === indice ? videoRef : undefined}
              src={item.url}
              className="w-full h-full object-cover"
              autoPlay
              muted={!conSonido}
              playsInline
              onEnded={siguiente}
            />
          ) : (
            <img
              src={item.url}
              alt={item.descripcion ?? ''}
              className="w-full h-full object-cover"
              loading={i === 0 ? 'eager' : 'lazy'}
            />
          )}
        </div>
      ))}

      {/* Botón de sonido, solo relevante mientras se muestra el video */}
      {actual?.tipo === 'VIDEO' && (
        <button
          onClick={() => setConSonido(s => !s)}
          className="absolute bottom-5 right-5 z-20 flex items-center gap-2 rounded-full bg-black/50 hover:bg-black/70 text-white text-xs font-medium px-3 py-2 backdrop-blur-sm transition-colors"
        >
          {conSonido ? '🔊 Silenciar' : '🔇 Activar sonido'}
        </button>
      )}

      {/* Flechas */}
      {items.length > 1 && (
        <>
          <button
            onClick={anterior}
            aria-label="Anterior"
            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-sm transition-colors"
          >
            ‹
          </button>
          <button
            onClick={siguiente}
            aria-label="Siguiente"
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-sm transition-colors"
          >
            ›
          </button>
        </>
      )}

      {/* Indicadores */}
      {items.length > 1 && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {items.map((item, i) => (
            <button
              key={item.id}
              onClick={() => setIndice(i)}
              aria-label={`Ir a la diapositiva ${i + 1}`}
              className={`h-2 rounded-full transition-all ${i === indice ? 'w-6 bg-[#C9A84C]' : 'w-2 bg-white/50 hover:bg-white/80'}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
