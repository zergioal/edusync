import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { getRolDashboardPath } from '../../lib/roleRoutes'
import { pedirPermiso, avisar, actualizarBadge } from '../../lib/notificacionesNativas'

interface Notificacion {
  id:               string
  tipo:             string
  titulo:           string
  cuerpo:           string
  leida:            boolean
  creada_en:        string
  referencia_id?:   string | null
  referencia_tipo?: string | null
}

interface ApiResult {
  items:     Notificacion[]
  no_leidas: number
}

const TIPO_COLOR: Record<string, string> = {
  PAGO:              'bg-green-100 text-green-700',
  ANUNCIO:           'bg-blue-100 text-blue-700',
  TAREA:             'bg-purple-100 text-purple-700',
  TRIMESTRE_CERRADO: 'bg-red-100 text-red-700',
  GENERAL:           'bg-surface-2 text-fg',
  OBSERVACION:       'bg-amber-100 text-amber-700',
}

export function NotificacionesBell() {
  const navigate = useNavigate()
  const { user }  = useAuth()
  const [open,      setOpen]      = useState(false)
  const [notifs,    setNotifs]    = useState<Notificacion[]>([])
  const [noLeidas,  setNoLeidas]  = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  // IDs no leídos ya vistos en el último poll — null = todavía no cargó nunca
  // (para no disparar avisos de todo lo pendiente en la primera carga de la página).
  const idsVistosRef = useRef<Set<string> | null>(null)

  const cargar = useCallback(async () => {
    try {
      const data = await api.get<ApiResult>('/notificaciones?solo_no_leidas=false')
      const idsNoLeidos = data.items.filter(n => !n.leida).map(n => n.id)

      if (idsVistosRef.current !== null) {
        const nuevas = data.items.filter(n => !n.leida && !idsVistosRef.current!.has(n.id))
        if (nuevas.length > 0) {
          const primera = nuevas[0]!
          avisar(primera.titulo, primera.cuerpo)
        }
      }
      idsVistosRef.current = new Set(idsNoLeidos)

      setNotifs(data.items)
      setNoLeidas(data.no_leidas)
      actualizarBadge(data.no_leidas)
    } catch { /* silencioso */ }
  }, [])

  // Poll cada 60s
  useEffect(() => {
    cargar()
    const id = setInterval(cargar, 60_000)
    return () => clearInterval(id)
  }, [cargar])

  // Cerrar al hacer clic fuera
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function marcarLeida(id: string) {
    try {
      await api.put(`/notificaciones/${id}/leer`, {})
      setNotifs(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n))
      setNoLeidas(prev => {
        const next = Math.max(0, prev - 1)
        actualizarBadge(next)
        return next
      })
    } catch { /* silencioso */ }
  }

  function toggleOpen() {
    setOpen(o => !o)
    pedirPermiso()
  }

  function handleClick(n: Notificacion) {
    if (!n.leida) marcarLeida(n.id)

    if (!user) return
    const base = getRolDashboardPath(user.rol)
    if (n.referencia_tipo === 'MENSAJE' && n.referencia_id) {
      navigate(`${base}/mensajes?mensajeId=${n.referencia_id}`)
      setOpen(false)
    } else if (n.referencia_tipo === 'ANUNCIO') {
      navigate(`${base}/anuncios`)
      setOpen(false)
    } else if (n.referencia_tipo === 'OBSERVACION_DIARIA') {
      navigate(`${base}/control-diario`)
      setOpen(false)
    }
  }

  async function marcarTodas() {
    try {
      await api.put('/notificaciones/leer-todas', {})
      setNotifs(prev => prev.map(n => ({ ...n, leida: true })))
      setNoLeidas(0)
      actualizarBadge(0)
    } catch { /* silencioso */ }
  }

  function fmt(s: string) {
    return new Date(s).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={toggleOpen}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg hover:bg-surface-2 transition-colors"
        aria-label="Notificaciones"
      >
        <svg className="h-5 w-5 text-fg-muted" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {noLeidas > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
            {noLeidas > 9 ? '9+' : noLeidas}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 rounded-xl border border-border bg-surface shadow-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-fg">Notificaciones</h3>
            {noLeidas > 0 && (
              <button onClick={marcarTodas} className="text-xs text-blue-600 hover:underline">
                Marcar todas leídas
              </button>
            )}
          </div>

          {/* Lista */}
          <div className="max-h-96 overflow-y-auto divide-y divide-border">
            {notifs.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-fg-muted">Sin notificaciones</div>
            ) : (
              notifs.map(n => (
                <div
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`px-4 py-3 cursor-pointer hover:bg-surface-2 transition-colors ${!n.leida ? 'bg-blue-50 dark:bg-blue-950/30' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`mt-0.5 inline-flex flex-shrink-0 items-center rounded-full px-1.5 py-0.5 text-xs font-medium ${TIPO_COLOR[n.tipo] ?? TIPO_COLOR['GENERAL']}`}>
                      {n.tipo.charAt(0)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!n.leida ? 'font-semibold text-fg' : 'text-fg'}`}>
                        {n.titulo}
                      </p>
                      <p className="text-xs text-fg-muted mt-0.5 truncate">{n.cuerpo}</p>
                      <p className="text-xs text-fg-muted mt-1">{fmt(n.creada_en)}</p>
                    </div>
                    {!n.leida && <span className="h-2 w-2 flex-shrink-0 rounded-full bg-blue-500 mt-1.5" />}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
