import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'

interface MesCuenta {
  id:          string
  mes:         number
  nombre_mes:  string
  monto:       number
  pagado:      boolean
  fecha_pago:  string | null
  comprobante: string | null
  dias_mora:   number
}

interface EstadoCuenta {
  becado:      boolean
  motivo_beca?: string | null
  mensaje?:    string
  estudiante:  { id: string; nombre: string; apellido: string; codigo: string; paralelo: string | null }
  gestion:     { id: string; anno: number } | null
  meses:       MesCuenta[]
  resumen:     { total_pagado: number; total_pendiente: number; meses_pagados: number; meses_pendientes: number; al_dia: boolean }
}

export default function PagosHijoPage() {
  const { estadoFinanciero } = useAuth()
  const hijos = estadoFinanciero?.hijos ?? []

  const [hijoId,  setHijoId]  = useState(hijos[0]?.id ?? '')
  const [cuenta,  setCuenta]  = useState<EstadoCuenta | null>(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const activeId   = hijoId || hijos[0]?.id || ''
  const hijoActual = hijos.find(h => h.id === activeId)

  useEffect(() => {
    if (!activeId) return
    setLoading(true); setError(null)
    api.get<EstadoCuenta>(`/pensiones/hijo/${activeId}`)
      .then(setCuenta)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Error al cargar'))
      .finally(() => setLoading(false))
  }, [activeId])

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-fg">Estado de Pensiones</h1>

      {hijos.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-fg-muted">Hijo/a:</span>
          {hijos.map(h => (
            <button
              key={h.id}
              onClick={() => setHijoId(h.id)}
              className={`rounded-full px-3 py-1 text-sm font-medium transition ${activeId === h.id ? 'bg-blue-600 text-white' : 'bg-surface-2 text-fg hover:bg-surface-2'}`}
            >
              {h.nombre} {h.apellido}
              {h.bloqueado && <span className="ml-1 text-red-500">⚠</span>}
            </button>
          ))}
        </div>
      )}

      {loading && <div className="p-8 text-center text-sm text-fg-muted">Cargando…</div>}
      {error   && <div className="rounded-lg bg-orange-50 p-3 text-sm text-orange-700">{error}</div>}

      {!loading && !error && cuenta?.becado && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-6 text-center">
          <p className="font-semibold text-blue-800">🎓 Estudiante becado</p>
          <p className="text-sm text-blue-600 mt-1">{cuenta.mensaje}</p>
        </div>
      )}

      {!loading && !error && cuenta && !cuenta.becado && (
        <>
          {/* Alerta deuda */}
          {hijoActual?.bloqueado && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-4 flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="font-semibold text-red-800">⚠️ Pensión pendiente de pago</div>
                <div className="text-sm text-red-600">Tienes pensiones vencidas sin pagar</div>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-red-700">Bs. {hijoActual.monto_pendiente.toFixed(2)}</div>
                {estadoFinanciero?.qr_pago_url && (
                  <img src={estadoFinanciero.qr_pago_url} alt="QR Pago" className="mt-2 w-16 h-16 mx-auto" />
                )}
              </div>
            </div>
          )}

          {/* Resumen */}
          <div className="flex gap-4">
            <div className="rounded-lg bg-green-50 border border-green-100 px-4 py-3 flex-1 text-center">
              <div className="text-lg font-bold text-green-700">{cuenta.resumen.meses_pagados}</div>
              <div className="text-xs text-green-600">Pagadas</div>
            </div>
            <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 flex-1 text-center">
              <div className="text-lg font-bold text-red-700">{cuenta.resumen.meses_pendientes}</div>
              <div className="text-xs text-red-600">Pendientes</div>
            </div>
            {cuenta.resumen.total_pendiente > 0 && (
              <div className="rounded-lg bg-orange-50 border border-orange-100 px-4 py-3 flex-1 text-center">
                <div className="text-lg font-bold text-orange-700">Bs. {cuenta.resumen.total_pendiente.toFixed(0)}</div>
                <div className="text-xs text-orange-600">Total deuda</div>
              </div>
            )}
          </div>

          {/* Grid de pensiones (Febrero a Noviembre) */}
          {cuenta.meses.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-border p-10 text-center text-sm text-fg-muted">
              No hay pensiones registradas para este período.
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
              {cuenta.meses.map(m => {
                const borderCls = m.pagado ? 'border-green-200' : 'border-red-200'
                const bgCls     = m.pagado ? 'bg-green-50'      : 'bg-red-50'
                const labelCls  = m.pagado ? 'text-green-600'   : 'text-red-600'

                return (
                  <div
                    key={m.id}
                    className={`rounded-xl border p-3 text-center ${bgCls} ${borderCls}`}
                    title={m.fecha_pago ? `Pagado: ${new Date(m.fecha_pago).toLocaleDateString('es-BO')}` : undefined}
                  >
                    <div className="text-xs font-semibold text-fg-muted mb-1">{m.nombre_mes}</div>
                    <div className="text-sm font-bold text-fg">Bs.{m.monto.toFixed(0)}</div>
                    <div className={`text-xs mt-0.5 font-medium ${labelCls}`}>
                      {m.pagado ? 'Pagado' : 'Pendiente'}
                    </div>
                    <div className={`text-xs mt-0.5 ${m.pagado ? 'text-green-500' : 'text-red-500'}`}>
                      {m.pagado ? '✓' : '✗'}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
