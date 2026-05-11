import { useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getNavGroup } from '../../lib/roleRoutes'
import { Sidebar } from './Sidebar'
import { NotificacionesBell } from '../ui/NotificacionesBell'

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const { user } = useAuth()
  const navItems   = user ? getNavGroup(user.rol) : []
  const [drawerOpen, setDrawerOpen] = useState(false)
  const location = useLocation()

  // Cierra el drawer al navegar
  useEffect(() => { setDrawerOpen(false) }, [location.pathname])

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">

      {/* ── Sidebar desktop (≥ md) ──────────────────────────────── */}
      <div className="hidden md:flex md:flex-shrink-0">
        <Sidebar navItems={navItems} />
      </div>

      {/* ── Drawer móvil + overlay ──────────────────────────────── */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
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

      {/* ── Contenido principal ─────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">

        {/* Header */}
        <header className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4 shadow-sm shrink-0">
          {/* Hamburguesa (solo móvil) */}
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="md:hidden rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Abrir menú"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Logo móvil */}
          <div className="md:hidden flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-500 font-bold text-white text-sm">
              E
            </div>
            <span className="text-sm font-bold text-gray-800">EduSync</span>
          </div>

          {/* Espaciador desktop */}
          <div className="hidden md:block" />

          {/* Acciones header */}
          <div className="flex items-center gap-2">
            <NotificacionesBell />
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
              <span className="text-sm font-semibold text-blue-700">
                {user?.nombre?.charAt(0)}{user?.apellido?.charAt(0)}
              </span>
            </div>
            {/* Nombre solo desktop */}
            <span className="hidden sm:block text-sm text-gray-600 max-w-[120px] truncate">
              {user?.nombre}
            </span>
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
