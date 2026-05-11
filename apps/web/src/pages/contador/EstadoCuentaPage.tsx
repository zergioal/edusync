import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { RegistrarPagoModal } from '../../components/pensiones/RegistrarPagoModal'

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
  estudiante: { id: string; nombre: string; apellido: string; codigo: string; paralelo: string | null }
  gestion:    { id: string; anno: number }
  meses:      MesCuenta[]
  resumen:    { total_pagado: number; total_pendiente: number; meses_pagados: number; meses_pendientes: number; al_dia: boolean }
}

interface Gestion { id: string; anno: number }

export default function EstadoCuentaPage() {
  const { id: estudiante_id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const mesActual = new Date().getMonth() + 1

  const [cuenta,     setCuenta]    = useState<EstadoCuenta | null>(null)
  const [gestiones,  setGestiones] = useState<Gestion[]>([])
  const [gestionId,  setGestionId] = useState('')
  const [loading,    setLoading]   = useState(true)
  const [error,      setError]     = useState<string | null>(null)
  const [pagoModal,  setPagoModal] = useState<MesCuenta | null>(null)

  useEffect(() => {
    api.get<Gestion[]>('/gestiones').then(gs => {
      setGestiones(gs)
      if (gs[0] && !gestionId) setGestionId(gs[0].id)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!estudiante_id || !gestionId) return
    setLoading(true)
    setError(null)
    api.get<EstadoCuenta>(`/pensiones/estado-cuenta/${estudiante_id}?gestion_id=${gestionId}`)
      .then(setCuenta)
      .catch(() => setError('No se pudo cargar el estado de cuenta'))
      .finally(() => setLoading(false))
  }, [estudiante_id, gestionId])

  const reload = () => {
    if (!estudiante_id || !gestionId) return
    api.get<EstadoCuenta>(`/pensiones/estado-cuenta/${estudiante_id}?gestion_id=${gestionId}`)
      .then(setCuenta).catch(() => {})
  }

  const canAnular = user?.rol === 'DIRECTOR' || user?.rol === 'ADMIN_SISTEMA'

  const anular = async (id: string) => {
    if (!confirm('¿Anular este pago?')) return
    try { await api.put(`/pensiones/${id}/anular`, {}); reload() }
    catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error') }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  )

  if (error || !cuenta) return (
    <div className="text-center py-16 text-red-500">{error ?? 'No encontrado'}</div>
  )

  const { estudiante, gestion, meses, resumen } = cuenta

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link to="/dashboard/admin/finanzas" className="hover:text-gray-700">Pensiones</Link>
        <span>/</span>
        <Link to="/dashboard/admin/finanzas/morosidad" className="hover:text-gray-700">Morosidad</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">Estado de cuenta</span>
      </div>

      {/* Encabezado estudiante */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {estudiante.apellido} {estudiante.nombre}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Código: <span className="font-mono">{estudiante.codigo}</span>
              {estudiante.paralelo && <> · {estudiante.paralelo}</>}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select value={gestionId} onChange={e => setGestionId(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
              {gestiones.map(g => <option key={g.id} value={g.id}>Gestión {g.anno}</option>)}
            </select>
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
              resumen.al_dia ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {resumen.al_dia ? 'Al día' : 'En mora'}
            </span>
          </div>
        </div>
      </div>

      {/* Tabla de meses */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Gestión {gestion.anno}</h2>
        </div>
        {meses.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-sm">
            No se han generado pensiones para esta gestión
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Mes', 'Monto', 'Estado', 'Fecha pago', 'Comprobante', 'Mora', 'Acciones'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {meses.map(m => (
                  <tr key={m.id}
                    className={`transition-colors ${
                      m.mes === mesActual ? 'bg-yellow-50 hover:bg-yellow-100' : 'hover:bg-gray-50'
                    }`}>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {m.nombre_mes}
                      {m.mes === mesActual && (
                        <span className="ml-1.5 text-xs bg-yellow-200 text-yellow-800 rounded px-1">actual</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900">Bs. {m.monto.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        m.pagado ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {m.pagado ? 'Pagado' : 'Pendiente'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {m.fecha_pago ? new Date(m.fecha_pago).toLocaleDateString('es-BO') : '—'}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{m.comprobante ?? '—'}</td>
                    <td className="px-4 py-3">
                      {!m.pagado && m.dias_mora > 0
                        ? <span className="text-red-500 text-xs font-medium">{m.dias_mora}d</span>
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {!m.pagado && (
                          <button onClick={() => setPagoModal(m)}
                            className="text-xs bg-green-600 hover:bg-green-700 text-white px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap">
                            Registrar pago
                          </button>
                        )}
                        {m.pagado && canAnular && (
                          <button onClick={() => anular(m.id)}
                            className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 transition-colors">
                            Anular
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <p className="text-xs text-green-600 font-medium">Total pagado</p>
          <p className="text-xl font-bold text-green-700 mt-1">Bs. {resumen.total_pagado.toFixed(2)}</p>
          <p className="text-xs text-green-500">{resumen.meses_pagados} meses</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
          <p className="text-xs text-red-500 font-medium">Total pendiente</p>
          <p className="text-xl font-bold text-red-700 mt-1">Bs. {resumen.total_pendiente.toFixed(2)}</p>
          <p className="text-xs text-red-400">{resumen.meses_pendientes} meses</p>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-xs text-gray-500 font-medium">Meses pagados</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{resumen.meses_pagados}</p>
          <p className="text-xs text-gray-400">de {meses.length} generados</p>
        </div>
        <div className={`border rounded-xl p-4 text-center ${resumen.al_dia ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <p className={`text-xs font-medium ${resumen.al_dia ? 'text-green-600' : 'text-red-500'}`}>Estado mes actual</p>
          <p className={`text-xl font-bold mt-1 ${resumen.al_dia ? 'text-green-700' : 'text-red-700'}`}>
            {resumen.al_dia ? 'Al día' : 'En mora'}
          </p>
        </div>
      </div>

      {pagoModal && (
        <RegistrarPagoModal
          pension={{ ...pagoModal, estudiante: { nombre: estudiante.nombre, apellido: estudiante.apellido, codigo: estudiante.codigo } }}
          onClose={() => setPagoModal(null)}
          onSuccess={() => { setPagoModal(null); reload() }}
        />
      )}
    </div>
  )
}
