import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { getTenantHeaders } from '../../config/tenant'

interface Anuncio {
  id:           string
  titulo:       string
  contenido:    string
  publicado_en: string
}

const API_BASE = (import.meta as unknown as { env: Record<string, string> }).env?.VITE_API_URL ?? '/api/v1'

export default function AnunciosPage() {
  const [anuncios, setAnuncios] = useState<Anuncio[]>([])
  const [loading,  setLoading]  = useState(true)
  const { hash }               = useLocation()

  useEffect(() => {
    fetch(`${API_BASE}/public/anuncios`, { headers: getTenantHeaders() })
      .then(r => r.json() as Promise<{ data: Anuncio[] }>)
      .then(b => { setAnuncios(b.data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  // Scroll al anuncio si viene con hash
  useEffect(() => {
    if (hash && !loading) {
      const el = document.querySelector(hash)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [hash, loading])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="sticky top-0 z-40 bg-[#1F3864] shadow-lg">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="text-white font-bold hover:text-blue-200 transition-colors">← Inicio</Link>
          <h1 className="text-white font-bold">Anuncios</h1>
          <Link to="/login" className="text-[#C9A84C] text-sm font-bold hover:text-yellow-400 transition-colors">
            Ingresar
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-[#1F3864]">Anuncios institucionales</h1>
          <p className="text-gray-500 mt-1 text-sm">Comunicados y noticias de la institución</p>
        </div>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-6 shadow-sm animate-pulse h-32" />
            ))}
          </div>
        ) : anuncios.length === 0 ? (
          <div className="text-center py-24 text-gray-400">No hay anuncios publicados</div>
        ) : (
          <div className="space-y-5">
            {anuncios.map(a => (
              <article key={a.id} id={a.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 scroll-mt-20">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <h2 className="text-lg font-bold text-[#1F3864] leading-snug">{a.titulo}</h2>
                  <time className="text-xs text-[#C9A84C] font-semibold whitespace-nowrap">
                    {new Date(a.publicado_en).toLocaleDateString('es-BO', {
                      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                    })}
                  </time>
                </div>
                <div className="mt-3 text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                  {a.contenido}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <footer className="bg-[#1F3864] text-white py-6 text-center text-sm text-blue-300 mt-16">
        <Link to="/" className="hover:text-white transition-colors">← Volver a Inicio</Link>
        <span className="mx-3">·</span>
        © {new Date().getFullYear()} Sistema EduSync
      </footer>
    </div>
  )
}
