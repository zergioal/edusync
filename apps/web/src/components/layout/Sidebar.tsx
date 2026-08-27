import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import type { NavItem } from '../../lib/roleRoutes'
import { NavIcon } from '../ui/NavIcon'
import { useAuth } from '../../context/AuthContext'
import { ROL_LABELS, getRolDashboardPath } from '../../lib/roleRoutes'
import logo from '../../assets/logo-pio-xii.png'

const ROL_BADGE_COLORS: Record<string, string> = {
  ADMIN_SISTEMA: 'bg-rose-500/20 text-rose-300',
  DIRECTOR:      'bg-amber-500/20 text-amber-300',
  COORDINADOR:   'bg-orange-500/20 text-orange-300',
  SECRETARIA:    'bg-indigo-500/20 text-indigo-300',
  DOCENTE:       'bg-sky-500/20 text-sky-300',
  REGENTE:       'bg-teal-500/20 text-teal-300',
  ESTUDIANTE:    'bg-emerald-500/20 text-emerald-300',
  PADRE_TUTOR:   'bg-purple-500/20 text-purple-300',
}

interface SidebarProps {
  navItems: NavItem[]
  onClose?: () => void
}

export function Sidebar({ navItems, onClose }: SidebarProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [quickOpen, setQuickOpen] = useState(false)
  const badgeClass = user?.rol ? (ROL_BADGE_COLORS[user.rol] ?? 'bg-white/10 text-white/70') : ''
  const basePath = user ? getRolDashboardPath(user.rol) : ''

  function goTo(path: string) {
    setQuickOpen(false)
    onClose?.()
    navigate(path)
  }

  return (
    <aside className="relative flex h-screen w-64 flex-col bg-[#0f172a] text-white select-none overflow-hidden">

      {/* Patrón de circuito de fondo — muy sutil, puramente decorativo */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        aria-hidden="true"
        style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'120\' height=\'120\' viewBox=\'0 0 120 120\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' stroke=\'%23818cf8\' stroke-width=\'1\'%3E%3Cpath d=\'M10 10h30v30M110 10H80v30M10 110h30V80M110 110H80V80M60 0v25M60 95v25M0 60h25M95 60h25\'/%3E%3Ccircle cx=\'10\' cy=\'10\' r=\'2.5\' fill=\'%23818cf8\'/%3E%3Ccircle cx=\'110\' cy=\'10\' r=\'2.5\' fill=\'%23818cf8\'/%3E%3Ccircle cx=\'10\' cy=\'110\' r=\'2.5\' fill=\'%23818cf8\'/%3E%3Ccircle cx=\'110\' cy=\'110\' r=\'2.5\' fill=\'%23818cf8\'/%3E%3Ccircle cx=\'60\' cy=\'60\' r=\'2\' fill=\'%23818cf8\'/%3E%3C/g%3E%3C/svg%3E")',
          backgroundSize: '120px 120px',
        }}
      />

      {/* ── Branding ─────────────────────────────────────── */}
      <div className="relative flex items-center gap-3 px-5 py-5 border-b border-white/8">
        {/* Accent line izquierda */}
        <div className="absolute left-0 top-0 bottom-0 w-1 rounded-r-full bg-gradient-to-b from-indigo-400 to-indigo-600" />
        <div className="relative">
          <img
            src={logo}
            alt="Pío XII"
            className="h-10 w-10 rounded-xl object-contain ring-2 ring-white/15 shadow-lg flex-shrink-0"
          />
          <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-[#0f172a]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold leading-tight text-white truncate">U.E. Pío XII</p>
          <p className="text-[10px] text-slate-400 leading-none mt-0.5 font-medium tracking-wide">EDUSYNC · Sistema</p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="md:hidden ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-white/8 hover:text-white transition-colors"
            aria-label="Cerrar menú"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* ── Navegación ───────────────────────────────────── */}
      <nav className="relative flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to.split('/').length <= 3}
            className={({ isActive }) =>
              [
                'glow-on-hover sidebar-nav-item group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-150',
                isActive
                  ? 'bg-indigo-600/20 text-white font-medium'
                  : 'text-slate-400 hover:bg-white/6 hover:text-slate-100',
              ].join(' ')
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-indigo-400 transition-opacity duration-150 ${
                    isActive ? 'opacity-100 animate-electric-pulse' : 'opacity-0 group-hover:opacity-100 group-hover:animate-electric-pulse'
                  }`}
                />
                <NavIcon
                  icon={item.icon}
                  className={`h-[18px] w-[18px] flex-shrink-0 transition-colors ${isActive ? 'text-indigo-300' : 'text-slate-500 group-hover:text-slate-300'}`}
                />
                <span className="truncate">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* ── Perfil + Logout ──────────────────────────────── */}
      <div className="relative border-t border-white/8 p-3 space-y-1">
        <div className="rounded-xl bg-white/5 px-3 py-3">
          <button
            type="button"
            onClick={() => setQuickOpen(o => !o)}
            className="w-full flex items-center gap-2.5 hover:opacity-90 transition-opacity"
          >
            <div className="relative h-9 w-9 flex-shrink-0">
              <div className={`absolute inset-0 rounded-full bg-gradient-to-br from-indigo-400 to-fuchsia-500 transition-all duration-500 ${quickOpen ? 'opacity-100 blur-[6px] scale-110' : 'opacity-0 blur-0 scale-100'}`} />
              <div className="relative h-9 w-9 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-bold text-white shadow">
                {user?.nombre?.charAt(0)}{user?.apellido?.charAt(0)}
              </div>
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-semibold text-white truncate leading-tight">
                {user?.nombre} {user?.apellido}
              </p>
              <span className={`inline-block mt-0.5 rounded-full px-2 py-px text-[10px] font-semibold leading-none ${badgeClass}`}>
                {user?.rol ? ROL_LABELS[user.rol] : ''}
              </span>
            </div>
            <svg className={`h-3.5 w-3.5 text-slate-400 flex-shrink-0 transition-transform duration-300 ${quickOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Accesos rápidos: se "funden" hacia afuera al abrir */}
          <div className={`grid transition-all duration-300 ease-out ${quickOpen ? 'grid-rows-[1fr] opacity-100 mt-2.5' : 'grid-rows-[0fr] opacity-0 mt-0'}`}>
            <div className="flex gap-2 overflow-hidden min-h-0">
              <button
                type="button"
                onClick={() => goTo(`${basePath}/mensajes`)}
                style={{ transitionDelay: quickOpen ? '60ms' : '0ms' }}
                className={`goo-pop flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 text-xs font-semibold py-2 ${quickOpen ? 'goo-pop-in' : 'goo-pop-out'}`}
              >
                <NavIcon icon="folder" className="h-3.5 w-3.5" />
                Mensajes
              </button>
              <button
                type="button"
                onClick={() => goTo(basePath)}
                style={{ transitionDelay: quickOpen ? '120ms' : '0ms' }}
                className={`goo-pop flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-fuchsia-500/20 hover:bg-fuchsia-500/30 text-fuchsia-200 text-xs font-semibold py-2 ${quickOpen ? 'goo-pop-in' : 'goo-pop-out'}`}
              >
                <NavIcon icon="home" className="h-3.5 w-3.5" />
                Panel
              </button>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={logout}
          className="glow-on-hover flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-slate-400 hover:bg-white/6 hover:text-slate-200 transition-colors"
        >
          <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
