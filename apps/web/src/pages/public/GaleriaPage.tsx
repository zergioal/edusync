import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getTenantHeaders } from '../../config/tenant'

interface GaleriaItem {
  id:          string
  url:         string
  descripcion: string | null
  tipo:        'FOTO' | 'VIDEO'
  publicado_en: string
}

const API_BASE = (import.meta as unknown as { env: Record<string, string> }).env?.VITE_API_URL ?? '/api/v1'

function isYouTube(url: string) {
  return url.includes('youtube.com') || url.includes('youtu.be')
}

function youtubeId(url: string) {
  const m = url.match(/(?:v=|youtu\.be\/)([^&?/]+)/)
  return m?.[1] ?? ''
}

export default function GaleriaPage() {
  const [items,     setItems]     = useState<GaleriaItem[]>([])
  const [loading,   setLoading]   = useState(true)
  const [filtro,    setFiltro]    = useState<'TODOS' | 'FOTO' | 'VIDEO'>('TODOS')
  const [lightbox,  setLightbox]  = useState<GaleriaItem | null>(null)

  useEffect(() => {
    fetch(`${API_BASE}/public/galeria`, { headers: getTenantHeaders() })
      .then(r => r.json() as Promise<{ data: GaleriaItem[] }>)
      .then(b => { setItems(b.data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const visibles = filtro === 'TODOS' ? items : items.filter(i => i.tipo === filtro)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="sticky top-0 z-40 bg-[#1F3864] shadow-lg">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="text-white font-bold hover:text-blue-200 transition-colors">← Inicio</Link>
          <h1 className="text-white font-bold">Galería</h1>
          <Link to="/login" className="text-[#C9A84C] text-sm font-bold hover:text-yellow-400 transition-colors">
            Ingresar
          </Link>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-black text-[#1F3864]">Galería institucional</h1>
            <p className="text-gray-500 text-sm mt-1">{items.length} elementos</p>
          </div>
          <div className="flex gap-2">
            {(['TODOS', 'FOTO', 'VIDEO'] as const).map(f => (
              <button key={f} onClick={() => setFiltro(f)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  filtro === f
                    ? 'bg-[#1F3864] text-white'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}>
                {f === 'TODOS' ? 'Todos' : f === 'FOTO' ? 'Fotos' : 'Videos'}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="aspect-square bg-gray-200 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : visibles.length === 0 ? (
          <div className="text-center py-24 text-gray-400">Sin elementos en la galería</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {visibles.map(item => (
              <button key={item.id} onClick={() => setLightbox(item)}
                className="group aspect-square bg-gray-200 rounded-xl overflow-hidden relative text-left focus:outline-none focus:ring-2 focus:ring-[#C9A84C]">
                {item.tipo === 'FOTO' ? (
                  <img src={item.url} alt={item.descripcion ?? ''} loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-900 flex items-center justify-center relative">
                    {isYouTube(item.url) && (
                      <img
                        src={`https://img.youtube.com/vi/${youtubeId(item.url)}/mqdefault.jpg`}
                        alt="" className="absolute inset-0 w-full h-full object-cover opacity-60"
                      />
                    )}
                    <div className="relative z-10 w-14 h-14 rounded-full bg-red-600 flex items-center justify-center shadow-lg">
                      <svg className="w-7 h-7 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </div>
                  </div>
                )}
                {item.descripcion && (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-200">
                    <p className="text-white text-xs line-clamp-2">{item.descripcion}</p>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/70 hover:text-white text-3xl font-light"
            onClick={() => setLightbox(null)}
          >
            ×
          </button>
          <div className="max-w-4xl w-full" onClick={e => e.stopPropagation()}>
            {lightbox.tipo === 'FOTO' ? (
              <img src={lightbox.url} alt={lightbox.descripcion ?? ''}
                className="max-h-[80vh] mx-auto rounded-xl object-contain"
              />
            ) : isYouTube(lightbox.url) ? (
              <div className="aspect-video rounded-xl overflow-hidden">
                <iframe
                  src={`https://www.youtube.com/embed/${youtubeId(lightbox.url)}?autoplay=1`}
                  className="w-full h-full" allowFullScreen
                  allow="autoplay; encrypted-media"
                />
              </div>
            ) : (
              <video src={lightbox.url} controls autoPlay className="max-h-[80vh] mx-auto rounded-xl" />
            )}
            {lightbox.descripcion && (
              <p className="text-center text-white/80 text-sm mt-3">{lightbox.descripcion}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
