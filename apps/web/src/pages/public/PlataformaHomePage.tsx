import type { ReactNode } from 'react'
import { ThemeToggle } from '../../components/ui/ThemeToggle'

interface Servicio {
  titulo: string
  desc:   string
  icon:   ReactNode
}

const SERVICIOS: Servicio[] = [
  {
    titulo: 'Gestión académica',
    desc:   'Registro de notas por dimensiones, centralizadores por curso y boletines oficiales listos para imprimir.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5 3 9l9 4.5 9-4.5-9-4.5ZM3 9v6M21 9v6M7.5 11.25V17c0 .5 2 2 4.5 2s4.5-1.5 4.5-2v-5.75" />
      </svg>
    ),
  },
  {
    titulo: 'Asistencia y control diario',
    desc:   'Asistencia de clase ligada al horario real de cada docente, observaciones diarias y reportes por estudiante o por curso.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
  },
  {
    titulo: 'Comunicados internos',
    desc:   'Anuncios de la institución y comunicados de cada docente a sus propios cursos, con notificación y control de visibilidad.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 3.75h3a1.5 1.5 0 0 1 1.5 1.5v.823c3 .963 5.25 3.912 5.25 7.427v1.5l1.5 2.25h-18l1.5-2.25v-1.5c0-3.515 2.25-6.464 5.25-7.427V5.25a1.5 1.5 0 0 1 1.5-1.5ZM9 19.5a3 3 0 0 0 6 0" />
      </svg>
    ),
  },
  {
    titulo: 'Portal de padres y estudiantes',
    desc:   'Boletines, asistencia, comunicados y estado de cuenta de cada hijo, todo en un solo lugar y en cualquier dispositivo.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.37 9.37 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM18.375 7.5a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
      </svg>
    ),
  },
  {
    titulo: 'Gestión financiera',
    desc:   'Pensiones, estado de cuenta por estudiante y control de becas, con el mismo nivel de detalle que una administración necesita.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182 1.106-.879 2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
  },
  {
    titulo: 'Una institución, un espacio propio',
    desc:   'Cada colegio tiene su propio subdominio y sus datos completamente aislados — su propia gestión, usuarios y contenido.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M6 21V8.25a1.5 1.5 0 0 1 1.5-1.5h9a1.5 1.5 0 0 1 1.5 1.5V21M9.75 9.75h.008M14.25 9.75h.008M9.75 13.5h.008M14.25 13.5h.008M9.75 17.25h.008M14.25 17.25h.008M10.5 3h3l.75 3.75h-4.5L10.5 3Z" />
      </svg>
    ),
  },
]

export default function PlataformaHomePage() {
  return (
    <div className="min-h-screen bg-surface font-sans">
      {/* ── Navbar ─────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-40 bg-surface/90 backdrop-blur-sm border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-20 flex items-center justify-between">
          <span className="font-black text-xl text-brand">EduSync</span>
          <div className="flex items-center gap-1 sm:gap-6">
            <a href="#servicios" className="text-sm font-medium text-fg-muted hover:text-fg transition-colors px-2 py-1 hidden sm:block">
              Servicios
            </a>
            <a href="#acerca" className="text-sm font-medium text-fg-muted hover:text-fg transition-colors px-2 py-1 hidden sm:block">
              Acerca de
            </a>
            <ThemeToggle />
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────── */}
      <section className="py-20 sm:py-28 px-4 text-center">
        <h1 className="text-4xl sm:text-5xl font-black text-fg max-w-3xl mx-auto leading-tight">
          Gestión educativa integral, <span className="text-brand">en una sola plataforma</span>
        </h1>
        <p className="mt-5 text-lg text-fg-muted max-w-xl mx-auto leading-relaxed">
          EduSync conecta a administrativos, docentes, estudiantes y familias: notas, asistencia,
          comunicados, boletines y pagos, todo en un mismo sistema pensado para instituciones educativas.
        </p>
        <a href="#servicios"
          className="mt-8 inline-block bg-brand text-brand-fg font-bold px-6 py-3 rounded-xl hover:bg-brand-hover transition-colors">
          Conoce los servicios
        </a>
      </section>

      {/* ── Servicios ──────────────────────────────────────────────── */}
      <section id="servicios" className="py-20 bg-surface-2">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-black text-fg text-center mb-3">Servicios de la plataforma</h2>
          <p className="text-fg-muted text-center mb-12 max-w-xl mx-auto">
            Todo lo que una institución necesita para su gestión académica y administrativa diaria.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {SERVICIOS.map(s => (
              <div key={s.titulo} className="bg-surface rounded-2xl p-6 shadow-sm ring-1 ring-border">
                <div className="h-11 w-11 rounded-xl bg-brand/10 text-brand flex items-center justify-center mb-4">
                  <div className="h-6 w-6">{s.icon}</div>
                </div>
                <h3 className="font-bold text-fg mb-1.5">{s.titulo}</h3>
                <p className="text-sm text-fg-muted leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Acerca de ──────────────────────────────────────────────── */}
      <section id="acerca" className="py-20 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-black text-fg mb-4">Acerca de</h2>
          <p className="text-fg-muted leading-relaxed">
            EduSync es creado y desarrollado por <strong className="text-fg">Sergio M. Alcocer V.</strong>,
            inicialmente para la Unidad Educativa Privada Pío XII, con el objetivo de dar a cualquier
            institución educativa una gestión académica y administrativa moderna, segura y en un solo lugar.
          </p>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer className="bg-surface-2 border-t border-border py-8 text-center">
        <p className="text-xs text-fg-muted/70">
          © {new Date().getFullYear()} EduSync — Sergio M. Alcocer V.
        </p>
      </footer>
    </div>
  )
}
