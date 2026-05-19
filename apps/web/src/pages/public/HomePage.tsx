import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getTenantHeaders } from '../../config/tenant'
import logoLocal from '../../assets/logo-pio-xii.png'

interface InstConfig {
  nombre:   string
  slogan:   string | null
  logo_url: string | null
  qr_url:   string | null
  whatsapp: string | null
  direccion: string | null
  telefono:  string | null
}

interface GaleriaItem { id: string; url: string; descripcion: string | null; tipo: string }
interface Anuncio     { id: string; titulo: string; contenido: string; publicado_en: string }

const API_BASE = (import.meta as unknown as { env: Record<string, string> }).env?.VITE_API_URL ?? '/api/v1'

async function fetchPublic<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}/public/${path}`, { headers: getTenantHeaders() })
  const body = await res.json() as { data: T }
  return body.data
}

export default function HomePage() {
  const [config,   setConfig]  = useState<InstConfig | null>(null)
  const [galeria,  setGaleria] = useState<GaleriaItem[]>([])
  const [anuncios, setAnuncios] = useState<Anuncio[]>([])
  const [qrPulse,  setQrPulse] = useState(false)

  useEffect(() => {
    fetchPublic<InstConfig>('config').then(setConfig).catch(() => {})
    fetchPublic<GaleriaItem[]>('galeria').then(items => setGaleria(items.slice(0, 6))).catch(() => {})
    fetchPublic<Anuncio[]>('anuncios').then(items => setAnuncios(items.slice(0, 3))).catch(() => {})
    const interval = setInterval(() => setQrPulse(p => !p), 2000)
    return () => clearInterval(interval)
  }, [])

  const nombre   = config?.nombre   ?? 'U.E. Pío XII'
  const slogan   = config?.slogan   ?? 'Educación con valores para la vida'
  const whatsappUrl = config?.whatsapp
    ? `https://wa.me/${config.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent('Hola, adjunto mi comprobante de pago de pensión.')}`
    : null

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* ── Navbar ─────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-40 bg-[#1F3864] shadow-lg">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={config?.logo_url ?? logoLocal}
              alt="Logo"
              className="h-10 w-10 rounded-full object-contain bg-white/10 p-0.5"
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

      {/* ── Hero ───────────────────────────────────────────────────── */}
      <section id="inicio" className="relative bg-gradient-to-br from-[#1F3864] to-[#2d5096] text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.4\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")'
          }}
        />
        <div className="relative max-w-6xl mx-auto px-4 py-24 text-center">
          <h1 className="text-4xl sm:text-6xl font-black mb-4 leading-tight"
            style={{ textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
            {nombre}
          </h1>
          <p className="text-blue-200 text-xl sm:text-2xl mb-10 max-w-2xl mx-auto">{slogan}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#galeria"
              className="bg-white/10 hover:bg-white/20 border border-white/30 text-white font-semibold px-8 py-3 rounded-xl transition-all backdrop-blur-sm">
              Ver galería
            </a>
            <a href="#pago"
              className="bg-[#C9A84C] hover:bg-yellow-500 text-[#1F3864] font-bold px-8 py-3 rounded-xl transition-colors shadow-lg">
              Pagar pensión
            </a>
          </div>
        </div>
        {/* Wave */}
        <svg className="absolute bottom-0 left-0 w-full" viewBox="0 0 1440 60" fill="none">
          <path d="M0 60L1440 60L1440 0C1200 50 960 0 720 30C480 60 240 10 0 40V60Z" fill="white"/>
        </svg>
      </section>

      {/* ── QR de pago ─────────────────────────────────────────────── */}
      <section id="pago" className="py-20 bg-gradient-to-b from-white to-blue-50">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-black text-[#1F3864] mb-2">Paga tu pensión fácilmente</h2>
          <p className="text-gray-500 mb-12">Desde cualquier app de banca móvil</p>

          <div className="grid md:grid-cols-2 gap-10 items-center">
            {/* QR */}
            <div className="flex flex-col items-center">
              {config?.qr_url ? (
                <div className="relative inline-block">
                  <div className={`absolute inset-0 rounded-2xl bg-blue-400 transition-all duration-1000 ${qrPulse ? 'opacity-30 scale-105' : 'opacity-0 scale-100'}`} />
                  <img src={config.qr_url} alt="QR de pago"
                    className="relative w-52 h-52 rounded-2xl border-4 border-[#C9A84C] shadow-xl object-contain bg-white p-2"
                  />
                </div>
              ) : (
                <div className="w-52 h-52 rounded-2xl border-4 border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-sm">
                  QR no configurado
                </div>
              )}
              <p className="mt-4 text-sm text-gray-500">Escanea para pagar por QR</p>
              {whatsappUrl && (
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
                  className="mt-4 flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors shadow-md">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  Enviar comprobante por WhatsApp
                </a>
              )}
            </div>

            {/* Pasos */}
            <div className="space-y-6 text-left">
              {[
                { step: '1', title: 'Abre tu app de banca móvil', desc: 'Cualquier banco o billetera digital que soporte QR.' },
                { step: '2', title: 'Escanea el código QR',       desc: 'Apunta la cámara al código y confirma el monto.' },
                { step: '3', title: 'Envía tu comprobante',       desc: 'Mándanos la foto del recibo por WhatsApp para registrar tu pago.' },
              ].map(s => (
                <div key={s.step} className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#C9A84C] flex items-center justify-center text-[#1F3864] font-black text-lg">
                    {s.step}
                  </div>
                  <div>
                    <p className="font-bold text-[#1F3864]">{s.title}</p>
                    <p className="text-sm text-gray-500 mt-0.5">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Galería preview ─────────────────────────────────────────── */}
      <section id="galeria" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="text-3xl font-black text-[#1F3864]">Galería</h2>
              <p className="text-gray-500 mt-1">Momentos de nuestra institución</p>
            </div>
            <Link to="/galeria" className="text-[#C9A84C] hover:text-yellow-600 font-semibold text-sm transition-colors">
              Ver toda la galería →
            </Link>
          </div>

          {galeria.length === 0 ? (
            <div className="grid grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-square bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {galeria.map(item => (
                <div key={item.id} className="group aspect-square bg-gray-100 rounded-xl overflow-hidden relative">
                  {item.tipo === 'FOTO' ? (
                    <img src={item.url} alt={item.descripcion ?? ''} loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-900 text-white">
                      <svg className="w-12 h-12 opacity-70" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
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

      {/* ── Anuncios recientes ──────────────────────────────────────── */}
      <section id="anuncios" className="py-20 bg-blue-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="text-3xl font-black text-[#1F3864]">Anuncios</h2>
              <p className="text-gray-500 mt-1">Últimas noticias de la institución</p>
            </div>
            <Link to="/anuncios" className="text-[#C9A84C] hover:text-yellow-600 font-semibold text-sm transition-colors">
              Ver todos →
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {anuncios.length === 0
              ? Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-xl p-5 shadow-sm animate-pulse h-36" />
                ))
              : anuncios.map(a => (
                  <Link key={a.id} to={`/anuncios#${a.id}`}
                    className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow group">
                    <p className="text-xs text-[#C9A84C] font-semibold mb-2">
                      {new Date(a.publicado_en).toLocaleDateString('es-BO', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                    <h3 className="font-bold text-[#1F3864] group-hover:text-blue-700 transition-colors leading-snug">{a.titulo}</h3>
                    <p className="text-sm text-gray-500 mt-2 line-clamp-2">{a.contenido}</p>
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
          <div className="border-t border-white/10 mt-8 pt-6 text-center text-blue-300 text-xs">
            © {new Date().getFullYear()} {nombre} · Sistema EduSync
          </div>
        </div>
      </footer>
    </div>
  )
}
