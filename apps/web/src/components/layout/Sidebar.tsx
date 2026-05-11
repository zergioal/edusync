import { NavLink } from 'react-router-dom'
import type { NavItem } from '../../lib/roleRoutes'
import { NavIcon } from '../ui/NavIcon'
import { useAuth } from '../../context/AuthContext'
import { ROL_LABELS } from '../../lib/roleRoutes'
import { Button } from '@edusync/ui'

interface SidebarProps {
  navItems: NavItem[]
  onClose?: () => void
}

export function Sidebar({ navItems, onClose }: SidebarProps) {
  const { user, logout } = useAuth()

  return (
    <aside className="flex h-screen w-64 flex-col bg-slate-900 text-white">
      {/* Logo + cerrar móvil */}
      <div className="flex items-center gap-3 border-b border-slate-700 px-5 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500 font-bold text-white shadow">
          E
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold leading-none">EduSync</p>
          <p className="mt-0.5 text-[10px] text-slate-400 leading-none">Gestión Educativa</p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="md:hidden rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
            aria-label="Cerrar menú"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Navegación */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to.split('/').length <= 3}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all',
                isActive
                  ? 'bg-blue-600 text-white font-medium shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white',
              ].join(' ')
            }
          >
            <NavIcon icon={item.icon} className="h-[18px] w-[18px] flex-shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Perfil + Logout */}
      <div className="border-t border-slate-700 px-4 py-4">
        <div className="mb-3 rounded-lg bg-slate-800 px-3 py-2.5">
          <p className="text-sm font-medium text-white truncate">
            {user?.nombre} {user?.apellido}
          </p>
          <p className="mt-0.5 text-xs text-slate-400 truncate">
            {user?.rol ? ROL_LABELS[user.rol] : ''}
          </p>
          <p className="mt-0.5 text-[10px] text-slate-500 truncate">{user?.email}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={logout}
          className="w-full justify-center text-slate-400 hover:text-white hover:bg-slate-800"
        >
          Cerrar sesión
        </Button>
      </div>
    </aside>
  )
}
