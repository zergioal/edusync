import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const MESES_CORTO = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

interface Pension {
  id: string; mes: number; monto: string; pagado: boolean; fecha_pago: string | null
}

export default function PagosHijoPage() {
  const { estadoFinanciero } = useAuth()
  const hijos = estadoFinanciero?.hijos ?? []

  const [hijoId,    setHijoId]    = useState(hijos[0]?.id ?? '')
  const [pensiones, setPensiones] = useState<Pension[]>([])
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  const hijoActual  = hijos.find(h => h.id === hijoId)
  const mesActual   = new Date().getMonth() + 1
  const pensionesMap = new Map(pensiones.map(p => [p.mes, p]))

  useEffect(() => {
    if (!hijoId) return
    setLoading(true); setError(null)
    api.get<Pension[]>(`/pensiones?estudiante_id=${hijoId}`)
      .then(setPensiones)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Error al cargar'))
      .finally(() => setLoading(false))
  }, [hijoId])

  const pendientes = pensiones.filter(p => !p.pagado)
  const totalDeuda = pendientes.reduce((s, p) => s + parseFloat(p.monto), 0)

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-gray-900">Estado de Pensiones</h1>

      {hijos.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-500">Hijo/a:</span>
          {hijos.map(h => (
            <button
              key={h.id}
              onClick={() => setHijoId(h.id)}
              className={`rounded-full px-3 py-1 text-sm font-medium transition ${hijoId === h.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              {h.nombre} {h.apellido}
              {h.bloqueado && <span className="ml-1 text-red-500">⚠</span>}
            </button>
          ))}
        </div>
      )}

      {/* Alerta deuda */}
      {hijoActual?.bloqueado && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="font-semibold text-red-800">⚠️ Pensión pendiente de pago</div>
            <div className="text-sm text-red-600">Mes de {MESES[(estadoFinanciero?.mes_activo ?? 1) - 1]}</div>
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
      {!loading && pensiones.length > 0 && (
        <div className="flex gap-4">
          <div className="rounded-lg bg-green-50 border border-green-100 px-4 py-3 flex-1 text-center">
            <div className="text-lg font-bold text-green-700">{pensiones.filter(p => p.pagado).length}</div>
            <div className="text-xs text-green-600">Pagadas</div>
          </div>
          <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 flex-1 text-center">
            <div className="text-lg font-bold text-red-700">{pendientes.length}</div>
            <div className="text-xs text-red-600">Pendientes</div>
          </div>
          {totalDeuda > 0 && (
            <div className="rounded-lg bg-orange-50 border border-orange-100 px-4 py-3 flex-1 text-center">
              <div className="text-lg font-bold text-orange-700">Bs. {totalDeuda.toFixed(0)}</div>
              <div className="text-xs text-orange-600">Total deuda</div>
            </div>
          )}
        </div>
      )}

      {loading && <div className="p-8 text-center text-sm text-gray-400">Cargando…</div>}
      {error   && <div className="rounded-lg bg-orange-50 p-3 text-sm text-orange-700">{error}</div>}

      {/* Grid 12 meses */}
      {!loading && (
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {Array.from({ length: 12 }, (_, i) => {
            const mes     = i + 1
            const pension = pensionesMap.get(mes)

            let borderCls = 'border-gray-200'
            let bgCls     = 'bg-gray-50'
            let labelCls  = 'text-gray-400'
            let label     = mes > mesActual ? 'Próxima' : 'Sin registro'
            let monto: string | null = null

            if (pension) {
              if (pension.pagado) {
                borderCls = 'border-green-200'; bgCls = 'bg-green-50'; labelCls = 'text-green-600'
                label = 'Pagado'; monto = pension.monto
              } else {
                borderCls = 'border-red-200'; bgCls = 'bg-red-50'; labelCls = 'text-red-600'
                label = 'Pendiente'; monto = pension.monto
              }
            }

            return (
              <div
                key={mes}
                className={`rounded-xl border p-3 text-center ${bgCls} ${borderCls}`}
                title={pension?.fecha_pago ? `Pagado: ${new Date(pension.fecha_pago).toLocaleDateString('es-BO')}` : undefined}
              >
                <div className="text-xs font-semibold text-gray-500 mb-1">{MESES_CORTO[i]}</div>
                {monto && (
                  <div className="text-sm font-bold text-gray-800">Bs.{parseFloat(monto).toFixed(0)}</div>
                )}
                <div className={`text-xs mt-0.5 font-medium ${labelCls}`}>{label}</div>
                {pension?.pagado && (
                  <div className="text-xs text-green-500 mt-0.5">✓</div>
                )}
                {pension && !pension.pagado && (
                  <div className="text-xs text-red-500 mt-0.5">✗</div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {!loading && pensiones.length === 0 && !error && (
        <div className="rounded-xl border-2 border-dashed border-gray-200 p-10 text-center text-sm text-gray-400">
          No hay pensiones registradas para este período.
        </div>
      )}
    </div>
  )
}
