import { useState, useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getNavGroup, getRolDashboardPath } from '../../lib/roleRoutes'
import { Rol } from '@edusync/types'
import { Sidebar } from './Sidebar'
import { NotificacionesBell } from '../ui/NotificacionesBell'
import { ThemeToggle } from '../ui/ThemeToggle'
import { LogoutOverlay } from '../ui/LogoutOverlay'
import logo from '../../assets/logo-pio-xii.png'

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const { user, logout, estadoFinanciero } = useAuth()
  const navigate = useNavigate()
  const baseNavItems = user ? getNavGroup(user.rol) : []
  // Estudiante bloqueado por mora: se ocultan las secciones académicas del sidebar
  // (el resto — perfil, comunicados, mensajes — sigue disponible normalmente).
  const navItems = (user?.rol === Rol.ESTUDIANTE && estadoFinanciero?.bloqueado)
    ? baseNavItems.filter(item => !/\/(notas|boletin|asistencia)$/.test(item.to))
    : baseNavItems
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [menuOpen,   setMenuOpen]   = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const location = useLocation()

  useEffect(() => { setDrawerOpen(false); setMenuOpen(false) }, [location.pathname])

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function handleEditarPerfil() {
    setMenuOpen(false)
    if (user) navigate(getRolDashboardPath(user.rol))
  }

  function handleLogout() {
    setMenuOpen(false)
    setLoggingOut(true)
    setTimeout(() => { logout() }, 650)
  }

  // Resolve current page label from nav items
  const currentNav = navItems.find(item => {
    const isExact = item.to.split('/').length <= 3
    return isExact ? location.pathname === item.to : location.pathname.startsWith(item.to)
  })
  const pageLabel = currentNav?.label ?? ''
  const homePath = user ? getRolDashboardPath(user.rol) : '/'
  const isHome   = location.pathname === homePath

  return (
    <div className="flex h-screen overflow-hidden bg-bg">

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
        <header className="flex h-14 items-center justify-between bg-surface border-b border-border px-4 md:px-6 shrink-0 shadow-sm">

          {/* Izquierda */}
          <div className="flex items-center gap-3">
            {/* Hamburguesa móvil */}
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="md:hidden rounded-xl p-2 text-fg-muted hover:bg-surface-2 hover:text-fg transition-colors"
              aria-label="Abrir menú"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Logo móvil (toca para ir al panel) */}
            <button
              type="button"
              onClick={() => navigate(homePath)}
              disabled={isHome}
              className="md:hidden flex items-center gap-2 rounded-lg py-1 pr-2 active:bg-surface-2 disabled:opacity-70 transition-colors"
              aria-label="Ir al panel"
              title="Ir al panel"
            >
              <img src={logo} alt="Pío XII" className="h-7 w-7 rounded-lg object-contain" />
              <span className="text-sm font-bold text-fg">U.E. Pío XII</span>
            </button>

            {/* Inicio (desktop) + título de página */}
            <div className="hidden md:flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate(homePath)}
                disabled={isHome}
                title="Ir al panel"
                aria-label="Ir al panel"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-fg-muted hover:bg-surface-2 hover:text-fg transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H14v-5h-4v5H4a1 1 0 01-1-1V9.5z" />
                </svg>
              </button>
              {pageLabel && (
                <>
                  <span className="text-xs text-fg-muted">/</span>
                  <span className="text-sm font-semibold text-fg">{pageLabel}</span>
                </>
              )}
            </div>
          </div>

          {/* Derecha */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <NotificacionesBell />

            <div ref={menuRef} className="relative hidden sm:block pl-2 border-l border-border">
              <button
                type="button"
                onClick={() => setMenuOpen(o => !o)}
                className="flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-surface-2 transition-colors"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand shadow-sm">
                  <span className="text-xs font-bold text-brand-fg">
                    {user?.nombre?.charAt(0)}{user?.apellido?.charAt(0)}
                  </span>
                </div>
                <div className="hidden md:block">
                  <p className="text-xs font-semibold text-fg leading-tight max-w-[130px] truncate">
                    {user?.nombre} {user?.apellido}
                  </p>
                </div>
                <svg className={`hidden md:block h-3.5 w-3.5 text-fg-muted transition-transform ${menuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-11 z-50 w-52 rounded-xl border border-border bg-surface shadow-xl overflow-hidden animate-slide-in">
                  <button
                    onClick={handleEditarPerfil}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-fg hover:bg-surface-2 transition-colors"
                  >
                    <svg className="h-4 w-4 text-fg-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Editar perfil
                  </button>
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors border-t border-border"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Página */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>

      {loggingOut && <LogoutOverlay />}
    </div>
  )
}
