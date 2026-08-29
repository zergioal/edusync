import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getTenantHeaders } from '../../config/tenant'
import logoLocal from '../../assets/logo-pio-xii.png'
import { galeriaEstatica, portadaVideo } from '../../lib/mediaEstatico'

interface InstConfig {
  nombre:   string
  slogan:   string | null
  logo_url: string | null
  whatsapp: string | null
  direccion: string | null
  telefono:  string | null
}

interface Anuncio { id: string; titulo: string; contenido: string; publicado_en: string }

// Reel de Facebook a mostrar en la página de inicio. Reemplázalo por el link
// del video que quieras publicitar (Compartir → Insertar video en el reel/post de Facebook).
const FACEBOOK_REEL_URL = 'https://www.facebook.com/reel/2281978282636774'

// Redes sociales del colegio, mostradas como iconos al final de la página.
const REDES_SOCIALES = [
  {
    nombre: 'Facebook',
    href: 'https://www.facebook.com/pioxiicbba/',
    icon: 'M22 12a10 10 0 1 0-11.5 9.95v-7.04H7.9V12h2.6V9.8c0-2.57 1.53-4 3.87-4 1.12 0 2.3.2 2.3.2v2.53h-1.3c-1.28 0-1.68.8-1.68 1.62V12h2.86l-.46 2.91h-2.4v7.04A10 10 0 0 0 22 12z',
  },
  {
    nombre: 'TikTok',
    href: 'https://www.tiktok.com/@colegio_pio_xii',
    icon: 'M16.6 5.82s.51.5 0 0A4.278 4.278 0 0 1 15.54 3h-3.09v12.4a2.592 2.592 0 0 1-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6 0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.64 0 3.33 2.76 5.7 5.69 5.7 3.14 0 5.69-2.55 5.69-5.7V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3s-1.88.09-3.24-1.48z',
  },
  {
    nombre: 'WhatsApp',
    href: 'https://wa.me/59163878593',
    icon: 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z',
  },
] as const

const API_BASE = (import.meta as unknown as { env: Record<string, string> }).env?.VITE_API_URL ?? '/api/v1'

async function fetchPublic<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}/public/${path}`, { headers: getTenantHeaders() })
  const body = await res.json() as { data: T }
  return body.data
}

const galeriaPreview = galeriaEstatica.slice(0, 6)

export default function HomePage() {
  const [config,   setConfig]  = useState<InstConfig | null>(null)
  const [anuncios, setAnuncios] = useState<Anuncio[]>([])

  useEffect(() => {
    fetchPublic<InstConfig>('config').then(setConfig).catch(() => {})
    fetchPublic<Anuncio[]>('anuncios').then(items => setAnuncios(items.slice(0, 3))).catch(() => {})
  }, [])

  const nombre = config?.nombre ?? 'U.E. Pío XII'
  const slogan = config?.slogan ?? 'Educación con valores para la vida'

  return (
    <div className="min-h-screen bg-surface font-sans">
      {/* ── Navbar ─────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-40 bg-[#1F3864] shadow-lg">
        <div className="max-w-6xl mx-auto px-4 h-24 sm:h-28 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={config?.logo_url ?? logoLocal}
              alt="Logo"
              className="h-20 sm:h-24 w-auto object-contain"
            />
            <span className="text-white font-bold text-lg hidden sm:block">{nombre}</span>
          </div>

          <div className="flex items-center gap-1 sm:gap-4">
            {['#inicio', '#galeria', '#anuncios', '#contacto'].map((href, i) => (
              <a key={href} href={href}
                className="text-blue-200 hover:text-white text-sm font-medium transition-colors px-2 py-1 rounded hidden md:block">
                {['Inicio', 'Galería', 'Anuncios', 'Contacto'][i]}
              </a>
            ))}
            <Link to="/login"
              className="bg-[#C9A84C] hover:bg-yellow-500 text-[#1F3864] text-sm font-bold px-4 py-2 rounded-xl transition-colors whitespace-nowrap">
              Ingresar al sistema
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Portada de video ───────────────────────────────────────── */}
      <section id="inicio" className="pt-6 pb-4 sm:pt-8 sm:pb-6 bg-black">
        <div className="max-w-5xl mx-auto px-4">
          <div className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-br from-[#1F3864] to-[#2d5096]">
            {portadaVideo ? (
              <video
                src={portadaVideo}
                className="w-full h-full object-cover"
                autoPlay muted loop playsInline controls
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-center text-blue-200 text-sm px-6">
                Copia un video horizontal (.mp4) en <code className="font-mono text-white mx-1">apps/web/src/assets/portada</code> para mostrarlo aquí.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Galería preview ─────────────────────────────────────────── */}
      <section id="galeria" className="py-20 bg-surface">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="text-3xl font-black text-[#1F3864]">Galería</h2>
              <p className="text-fg-muted mt-1">Momentos de nuestra institución</p>
            </div>
            <Link to="/galeria" className="text-[#C9A84C] hover:text-yellow-600 font-semibold text-sm transition-colors">
              Ver toda la galería →
            </Link>
          </div>

          {galeriaPreview.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-fg-muted">
              Aún no hay fotos. Copia tus imágenes en <code className="font-mono">apps/web/src/assets/galeria</code> y aparecerán aquí.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {galeriaPreview.map(item => (
                <div key={item.id} className="group aspect-square bg-surface-2 rounded-xl overflow-hidden relative">
                  {item.tipo === 'FOTO' ? (
                    <img src={item.url} alt={item.descripcion ?? ''} loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="relative w-full h-full bg-gray-900">
                      <video src={item.url} muted playsInline preload="metadata"
                        className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-300" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z"/>
                          </svg>
                        </div>
                      </div>
                    </div>
                  )}
                  {item.descripcion && (
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-200">
                      <p className="text-white text-xs">{item.descripcion}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Video destacado (Facebook) ────────────────────────────────── */}
      {FACEBOOK_REEL_URL && (
        <section className="py-20 bg-[#1F3864] text-white">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h2 className="text-3xl font-black mb-2">Míranos en acción</h2>
            <p className="text-blue-200 mb-10">Un vistazo a la vida en {nombre}</p>

            <div className="mx-auto w-full max-w-[360px] aspect-[9/16] rounded-2xl overflow-hidden shadow-2xl bg-black">
              <iframe
                src={`https://www.facebook.com/plugins/video.php?height=640&href=${encodeURIComponent(FACEBOOK_REEL_URL)}&show_text=false&width=360&t=0`}
                width="100%" height="100%"
                style={{ border: 'none', overflow: 'hidden' }}
                scrolling="no" frameBorder="0"
                allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                allowFullScreen
                title="Video institucional"
              />
            </div>

            <a href={FACEBOOK_REEL_URL} target="_blank" rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-2 text-[#C9A84C] hover:text-yellow-400 font-semibold text-sm transition-colors">
              Ver en Facebook →
            </a>
          </div>
        </section>
      )}

      {/* ── Anuncios recientes ──────────────────────────────────────── */}
      <section id="anuncios" className="py-20 bg-blue-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="text-3xl font-black text-[#1F3864]">Anuncios</h2>
              <p className="text-fg-muted mt-1">Últimas noticias de la institución</p>
            </div>
            <Link to="/anuncios" className="text-[#C9A84C] hover:text-yellow-600 font-semibold text-sm transition-colors">
              Ver todos →
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {anuncios.length === 0
              ? Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="bg-surface rounded-xl p-5 shadow-sm animate-pulse h-36" />
                ))
              : anuncios.map(a => (
                  <Link key={a.id} to={`/anuncios#${a.id}`}
                    className="bg-surface rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow group">
                    <p className="text-xs text-[#C9A84C] font-semibold mb-2">
                      {new Date(a.publicado_en).toLocaleDateString('es-BO', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                    <h3 className="font-bold text-[#1F3864] group-hover:text-blue-700 transition-colors leading-snug">{a.titulo}</h3>
                    <p className="text-sm text-fg-muted mt-2 line-clamp-2">{a.contenido}</p>
                  </Link>
                ))
            }
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer id="contacto" className="bg-[#1F3864] text-white py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <h3 className="font-black text-xl mb-2">{nombre}</h3>
              <p className="text-blue-200 text-sm">{slogan}</p>
            </div>
            <div>
              <h4 className="font-semibold text-[#C9A84C] mb-3">Contacto</h4>
              <div className="space-y-1 text-sm text-blue-200">
                {config?.direccion && <p>📍 {config.direccion}</p>}
                {config?.telefono  && <p>📞 {config.telefono}</p>}
                {config?.whatsapp  && (
                  <a href={`https://wa.me/${config.whatsapp.replace(/\D/g, '')}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-white transition-colors">
                    💬 WhatsApp
                  </a>
                )}
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-[#C9A84C] mb-3">Acceso</h4>
              <Link to="/login"
                className="inline-block bg-[#C9A84C] hover:bg-yellow-500 text-[#1F3864] font-bold px-5 py-2 rounded-xl transition-colors text-sm">
                Ingresar al sistema
              </Link>
            </div>
          </div>

          <div className="border-t border-white/10 mt-8 pt-6 flex flex-col items-center gap-4">
            <div className="flex items-center gap-3">
              {REDES_SOCIALES.map(red => (
                <a key={red.nombre} href={red.href} target="_blank" rel="noopener noreferrer"
                  aria-label={red.nombre}
                  className="w-10 h-10 rounded-full bg-white/10 hover:bg-[#C9A84C] flex items-center justify-center text-white hover:text-[#1F3864] transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d={red.icon}/>
                  </svg>
                </a>
              ))}
            </div>
            <p className="text-center text-blue-300 text-xs">
              © {new Date().getFullYear()} {nombre} · Sistema EduSync
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
