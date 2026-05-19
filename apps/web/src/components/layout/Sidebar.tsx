import { NavLink } from 'react-router-dom'
import type { NavItem } from '../../lib/roleRoutes'
import { NavIcon } from '../ui/NavIcon'
import { useAuth } from '../../context/AuthContext'
import { ROL_LABELS } from '../../lib/roleRoutes'
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
  const badgeClass = user?.rol ? (ROL_BADGE_COLORS[user.rol] ?? 'bg-white/10 text-white/70') : ''

  return (
    <aside className="flex h-screen w-64 flex-col bg-[#0f172a] text-white select-none">

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
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to.split('/').length <= 3}
            className={({ isActive }) =>
              [
                'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-150',
                isActive
                  ? 'bg-indigo-600/20 text-white font-medium'
                  : 'text-slate-400 hover:bg-white/6 hover:text-slate-100',
              ].join(' ')
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-indigo-400" />
                )}
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
      <div className="border-t border-white/8 p-3 space-y-1">
        <div className="rounded-xl bg-white/5 px-3 py-3">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0 text-sm font-bold text-white shadow">
              {user?.nombre?.charAt(0)}{user?.apellido?.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate leading-tight">
                {user?.nombre} {user?.apellido}
              </p>
              <span className={`inline-block mt-0.5 rounded-full px-2 py-px text-[10px] font-semibold leading-none ${badgeClass}`}>
                {user?.rol ? ROL_LABELS[user.rol] : ''}
              </span>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={logout}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-slate-400 hover:bg-white/6 hover:text-slate-200 transition-colors"
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
