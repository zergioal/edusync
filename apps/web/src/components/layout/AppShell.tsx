import { useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getNavGroup } from '../../lib/roleRoutes'
import { Sidebar } from './Sidebar'
import { NotificacionesBell } from '../ui/NotificacionesBell'
import logo from '../../assets/logo-pio-xii.png'

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const { user } = useAuth()
  const navItems    = user ? getNavGroup(user.rol) : []
  const [drawerOpen, setDrawerOpen] = useState(false)
  const location = useLocation()

  useEffect(() => { setDrawerOpen(false) }, [location.pathname])

  // Resolve current page label from nav items
  const currentNav = navItems.find(item => {
    const isExact = item.to.split('/').length <= 3
    return isExact ? location.pathname === item.to : location.pathname.startsWith(item.to)
  })
  const pageLabel = currentNav?.label ?? ''

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">

      {/* ── Sidebar desktop ─────────────────────────────── */}
      <div className="hidden md:flex md:flex-shrink-0">
        <Sidebar navItems={navItems} />
      </div>

      {/* ── Drawer móvil + overlay ───────────────────────── */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}
      <div
        className={`fixed inset-y-0 left-0 z-50 flex md:hidden transition-transform duration-300 ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar navItems={navItems} onClose={() => setDrawerOpen(false)} />
      </div>

      {/* ── Contenido principal ──────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">

        {/* Header */}
        <header className="flex h-14 items-center justify-between bg-white border-b border-gray-200/80 px-4 md:px-6 shrink-0 shadow-sm">

          {/* Izquierda */}
          <div className="flex items-center gap-3">
            {/* Hamburguesa móvil */}
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="md:hidden rounded-xl p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
              aria-label="Abrir menú"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Logo móvil */}
            <div className="md:hidden flex items-center gap-2">
              <img src={logo} alt="Pío XII" className="h-7 w-7 rounded-lg object-contain" />
              <span className="text-sm font-bold text-gray-800">U.E. Pío XII</span>
            </div>

            {/* Título de página (desktop) */}
            {pageLabel && (
              <div className="hidden md:flex items-center gap-2">
                <span className="text-xs text-gray-400">/</span>
                <span className="text-sm font-semibold text-gray-700">{pageLabel}</span>
              </div>
            )}
          </div>

          {/* Derecha */}
          <div className="flex items-center gap-2">
            <NotificacionesBell />
            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-gray-200">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 shadow-sm">
                <span className="text-xs font-bold text-white">
                  {user?.nombre?.charAt(0)}{user?.apellido?.charAt(0)}
                </span>
              </div>
              <div className="hidden md:block">
                <p className="text-xs font-semibold text-gray-800 leading-tight max-w-[130px] truncate">
                  {user?.nombre} {user?.apellido}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Página */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
