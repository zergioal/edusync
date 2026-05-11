import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { api, ApiError } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { RegistrarPagoMultipleModal } from '../../components/pensiones/RegistrarPagoMultipleModal'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Paralelo { id: string; letra: string; grado: { nombre: string; nivel: { nombre: string } } }
interface Gestion  { id: string; anno: number }
interface Nivel    { id: string; nombre: string }

interface PensionRow {
  id:          string
  mes:         number
  nombre_mes:  string
  monto:       number
  pagado:      boolean
  fecha_pago:  string | null
  comprobante: string | null
  dias_mora:   number
  nivel:       string | null
  estudiante: {
    id:       string
    codigo:   string
    nombre:   string
    apellido: string
    paralelo: { letra: string; grado: string } | null
  }
}

interface PreviewRow {
  cantidad:       number
  monto_unitario: number
  total:          number
}

interface PreviewData {
  tarifas_configuradas: boolean
  por_nivel:    Record<string, PreviewRow>
  becados_count: number
  monto_total:  number
  ya_generado:  boolean
}

const MESES = [
  { v: 1, l: 'Enero' }, { v: 2, l: 'Febrero' }, { v: 3, l: 'Marzo' },
  { v: 4, l: 'Abril' }, { v: 5, l: 'Mayo' }, { v: 6, l: 'Junio' },
  { v: 7, l: 'Julio' }, { v: 8, l: 'Agosto' }, { v: 9, l: 'Septiembre' },
  { v: 10, l: 'Octubre' }, { v: 11, l: 'Noviembre' }, { v: 12, l: 'Diciembre' },
]

// ─── Componente ───────────────────────────────────────────────────────────────

export default function PensionesPage() {
  const { user } = useAuth()
  const mesActual = new Date().getMonth() + 1

  const [gestiones,  setGestiones]  = useState<Gestion[]>([])
  const [paralelos,  setParalelos]  = useState<Paralelo[]>([])
  const [niveles,    setNiveles]    = useState<Nivel[]>([])
  const [pensiones,  setPensiones]  = useState<PensionRow[]>([])
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  const [gestionId,  setGestionId]  = useState('')
  const [mes,        setMes]        = useState(mesActual)
  const [paraleloId, setParaleloId] = useState('')
  const [nivelId,    setNivelId]    = useState('')
  const [buscar,     setBuscar]     = useState('')
  const [estado,     setEstado]     = useState('')

  const [pagoModal,  setPagoModal]  = useState<PensionRow['estudiante'] | null>(null)

  const [previewOpen,    setPreviewOpen]    = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewData,    setPreviewData]    = useState<PreviewData | null>(null)
  const [previewError,   setPreviewError]   = useState<string | null>(null)
  const [genLoading,     setGenLoading]     = useState(false)
  const [genMsg,         setGenMsg]         = useState<string | null>(null)

  useEffect(() => {
    api.get<Gestion[]>('/gestiones').then(gs => {
      setGestiones(gs)
      if (gs[0]) setGestionId(gs[0].id)
    }).catch(() => {})
    api.get<Paralelo[]>('/paralelos').then(setParalelos).catch(() => {})
    api.get<Nivel[]>('/niveles').then(setNiveles).catch(() => {})
  }, [])

  const load = useCallback(async () => {
    if (!gestionId) return
    setLoading(true)
    setError(null)
    try {
      const qs = new URLSearchParams({
        gestion_id: gestionId,
        mes: String(mes),
        ...(paraleloId ? { paralelo_id: paraleloId } : {}),
        ...(nivelId    ? { nivel_id: nivelId }       : {}),
        ...(estado     ? { estado }                  : {}),
        ...(buscar     ? { buscar }                  : {}),
      })
      setPensiones(await api.get<PensionRow[]>(`/pensiones?${qs}`))
    } catch {
      setError('No se pudo cargar la lista de pensiones')
    } finally {
      setLoading(false)
    }
  }, [gestionId, mes, paraleloId, nivelId, estado, buscar])

  useEffect(() => { load() }, [load])

  // Stats
  const total          = pensiones.length
  const pagados        = pensiones.filter(p => p.pagado)
  const pendientes     = pensiones.filter(p => !p.pagado)
  const montoPagado    = pagados.reduce((s, p) => s + p.monto, 0)
  const montoPendiente = pendientes.reduce((s, p) => s + p.monto, 0)
  const pctCobro       = total > 0 ? Math.round((pagados.length / total) * 100) : 0

  const abrirPreview = async () => {
    setPreviewOpen(true)
    setPreviewLoading(true)
    setPreviewError(null)
    setPreviewData(null)
    setGenMsg(null)
    try {
      const qs = new URLSearchParams({ gestion_id: gestionId, mes: String(mes) })
      const res = await api.get<PreviewData>(`/pensiones/preview-mes?${qs}`)
      setPreviewData(res)
    } catch (e) {
      setPreviewError(e instanceof ApiError ? e.message : 'Error al cargar el preview')
    } finally {
      setPreviewLoading(false)
    }
  }

  const confirmarGenerar = async () => {
    setGenLoading(true)
    setGenMsg(null)
    try {
      const r = await api.post<{ creadas: number; omitidas_becados: number; omitidas_duplicadas: number }>(
        '/pensiones/generar-mes',
        { gestion_id: gestionId, mes },
      )
      setGenMsg(`Creadas: ${r.creadas} pensiones. Becados omitidos: ${r.omitidas_becados}. Duplicadas: ${r.omitidas_duplicadas}.`)
      load()
    } catch (e) {
      setGenMsg(e instanceof ApiError ? e.message : 'Error al generar')
    } finally {
      setGenLoading(false)
    }
  }

  const canAnular = user?.rol === 'DIRECTOR' || user?.rol === 'ADMIN_SISTEMA'

  const anular = async (id: string) => {
    if (!confirm('¿Anular este pago? El acceso del estudiante volverá a bloquearse.')) return
    try {
      await api.put(`/pensiones/${id}/anular`, {})
      load()
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'Error al anular')
    }
  }

  const mesNombre = MESES.find(m => m.v === mes)?.l ?? ''

  // Agrupar paralelos por nivel para los botones
  const paralelosPorNivel = paralelos.reduce<Record<string, Paralelo[]>>((acc, p) => {
    const nivel = p.grado.nivel.nombre
    if (!acc[nivel]) acc[nivel] = []
    acc[nivel]!.push(p)
    return acc
  }, {})

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Pensiones escolares</h1>
        <div className="flex items-center gap-3">
          <Link to="/dashboard/admin/finanzas/tarifas"
            className="text-sm text-indigo-600 hover:underline font-medium">
            Tarifas →
          </Link>
          <Link to="/dashboard/admin/finanzas/morosidad"
            className="text-sm text-blue-600 hover:underline font-medium">
            Morosidad →
          </Link>
        </div>
      </div>

      {/* Barra de búsqueda prominente */}
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
          <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
          </svg>
        </div>
        <input
          type="text"
          placeholder="Buscar estudiante por nombre o código…"
          value={buscar}
          onChange={e => setBuscar(e.target.value)}
          className="w-full rounded-xl border border-gray-300 bg-white pl-11 pr-4 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        {buscar && (
          <button
            onClick={() => setBuscar('')}
            className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-gray-600"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Filtros secundarios */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3">
        <div className="flex flex-wrap gap-2 items-center">
          <select value={gestionId} onChange={e => setGestionId(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
            {gestiones.map(g => <option key={g.id} value={g.id}>Gestión {g.anno}</option>)}
          </select>

          <select value={mes} onChange={e => setMes(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
            {MESES.map(m => (
              <option key={m.v} value={m.v}>{m.l}{m.v === mesActual ? ' ★' : ''}</option>
            ))}
          </select>

          <select value={nivelId} onChange={e => { setNivelId(e.target.value); setParaleloId('') }}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
            <option value="">Todos los niveles</option>
            {niveles.map(n => <option key={n.id} value={n.id}>{n.nombre}</option>)}
          </select>

          <select value={estado} onChange={e => setEstado(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
            <option value="">Todos</option>
            <option value="pagado">Pagados</option>
            <option value="pendiente">Pendientes</option>
          </select>

          <div className="ml-auto">
            <button
              onClick={abrirPreview}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg px-4 py-1.5 transition-colors"
            >
              Generar mes
            </button>
          </div>
        </div>
      </div>

      {/* Botones de paralelo */}
      {paralelos.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 mr-1">
              Filtrar por curso:
            </span>
            <button
              onClick={() => setParaleloId('')}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${!paraleloId ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              Todos
            </button>
            {Object.entries(paralelosPorNivel).map(([nivel, pars]) => (
              <div key={nivel} className="flex items-center gap-1 flex-wrap">
                <span className="text-xs text-gray-400 px-1">{nivel}:</span>
                {pars
                  .sort((a, b) => `${a.grado.nombre}${a.letra}`.localeCompare(`${b.grado.nombre}${b.letra}`))
                  .map(p => (
                    <button
                      key={p.id}
                      onClick={() => setParaleloId(prev => prev === p.id ? '' : p.id)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition ${paraleloId === p.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    >
                      {p.grado.nombre} &ldquo;{p.letra}&rdquo;
                    </button>
                  ))
                }
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{total}</p>
          <p className="text-xs text-gray-400 mt-0.5">en el mes seleccionado</p>
        </div>
        <div className="bg-white rounded-xl border border-green-200 shadow-sm p-4">
          <p className="text-xs text-green-600 font-medium uppercase tracking-wide">Pagados</p>
          <p className="text-3xl font-bold text-green-700 mt-1">{pagados.length}</p>
          <p className="text-xs text-green-500 mt-0.5">Bs. {montoPagado.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-xl border border-red-200 shadow-sm p-4">
          <p className="text-xs text-red-500 font-medium uppercase tracking-wide">Pendientes</p>
          <p className="text-3xl font-bold text-red-600 mt-1">{pendientes.length}</p>
          <p className="text-xs text-red-400 mt-0.5">Bs. {montoPendiente.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">% Cobrado</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{pctCobro}%</p>
          <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full transition-all duration-500" style={{ width: `${pctCobro}%` }} />
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400 text-sm">Cargando…</div>
        ) : error ? (
          <div className="p-8 text-center text-red-500 text-sm">{error}</div>
        ) : pensiones.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-sm">
            No hay pensiones para los filtros seleccionados
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Código', 'Estudiante', 'Nivel', 'Paralelo', 'Monto', 'Estado', 'Fecha pago', 'Comprobante', 'Mora', 'Acciones'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pensiones.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.estudiante.codigo}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      <button
                        onClick={() => setPagoModal(p.estudiante)}
                        className="text-left hover:text-blue-700 hover:underline transition-colors"
                      >
                        {p.estudiante.apellido} {p.estudiante.nombre}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{p.nivel ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {p.estudiante.paralelo
                        ? `${p.estudiante.paralelo.grado} "${p.estudiante.paralelo.letra}"`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900">Bs. {p.monto.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        p.pagado ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {p.pagado ? 'Pagado' : 'Pendiente'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {p.fecha_pago ? new Date(p.fecha_pago).toLocaleDateString('es-BO') : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600 font-mono text-xs">{p.comprobante ?? '—'}</td>
                    <td className="px-4 py-3">
                      {!p.pagado && p.dias_mora > 0 ? (
                        <span className="text-red-500 text-xs font-medium">{p.dias_mora}d</span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {!p.pagado && (
                          <button
                            onClick={() => setPagoModal(p.estudiante)}
                            className="bg-green-600 hover:bg-green-700 text-white text-xs font-medium px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap"
                          >
                            Registrar pago
                          </button>
                        )}
                        <Link
                          to={`/dashboard/admin/finanzas/estudiante/${p.estudiante.id}`}
                          className="text-blue-600 hover:text-blue-800 text-xs font-medium px-2.5 py-1 rounded-lg hover:bg-blue-50 transition-colors whitespace-nowrap"
                        >
                          Ver cuenta
                        </Link>
                        {p.pagado && canAnular && (
                          <button
                            onClick={() => anular(p.id)}
                            className="text-red-500 hover:text-red-700 text-xs px-2 py-1 rounded hover:bg-red-50 transition-colors"
                          >
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

      {/* Modal registrar pago múltiple */}
      {pagoModal && (
        <RegistrarPagoMultipleModal
          estudianteId={pagoModal.id}
          nombre={pagoModal.nombre}
          apellido={pagoModal.apellido}
          codigo={pagoModal.codigo}
          gestionId={gestionId}
          onClose={() => setPagoModal(null)}
          onSuccess={() => { setPagoModal(null); load() }}
        />
      )}

      {/* Modal preview / generar mes */}
      {previewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">
              Generar pensiones — {mesNombre}
            </h2>

            {previewLoading && (
              <div className="py-8 text-center text-gray-400 text-sm">Calculando…</div>
            )}

            {previewError && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {previewError}
              </div>
            )}

            {previewData && !previewLoading && (
              <>
                {!previewData.tarifas_configuradas && (
                  <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 space-y-1">
                    <p className="font-semibold">Sin tarifas configuradas</p>
                    <p>Configura las tarifas de pensión antes de generar los cobros.</p>
                    <Link to="/dashboard/admin/finanzas/tarifas"
                      className="text-indigo-600 font-medium hover:underline block mt-1">
                      Ir a Tarifas →
                    </Link>
                  </div>
                )}

                {previewData.tarifas_configuradas && (
                  <>
                    {previewData.ya_generado && (
                      <div className="rounded-lg bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm text-yellow-800">
                        Ya se generaron pensiones para este mes. Si continúas, sólo se crearán para los estudiantes que aún no tienen.
                      </div>
                    )}

                    <div className="rounded-xl border border-gray-200 overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Nivel</th>
                            <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estudiantes</th>
                            <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tarifa</th>
                            <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {Object.entries(previewData.por_nivel).map(([nivel, r]) => (
                            <tr key={nivel}>
                              <td className="px-4 py-2 font-medium text-gray-900">{nivel}</td>
                              <td className="px-4 py-2 text-right text-gray-700">{r.cantidad}</td>
                              <td className="px-4 py-2 text-right text-gray-700">Bs. {r.monto_unitario.toFixed(2)}</td>
                              <td className="px-4 py-2 text-right font-semibold text-gray-900">Bs. {r.total.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-gray-50 border-t border-gray-200">
                          <tr>
                            <td colSpan={3} className="px-4 py-2 text-sm font-semibold text-gray-700">Total a cobrar</td>
                            <td className="px-4 py-2 text-right font-bold text-blue-700">Bs. {previewData.monto_total.toFixed(2)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {previewData.becados_count > 0 && (
                      <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                        {previewData.becados_count} estudiante{previewData.becados_count !== 1 ? 's' : ''} becado{previewData.becados_count !== 1 ? 's' : ''} serán omitidos automáticamente.
                      </p>
                    )}
                  </>
                )}
              </>
            )}

            {genMsg && (
              <p className="text-sm text-blue-600 bg-blue-50 rounded-lg px-3 py-2">{genMsg}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setPreviewOpen(false); setGenMsg(null); setPreviewData(null) }}
                className="flex-1 border border-gray-300 rounded-xl py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {genMsg ? 'Cerrar' : 'Cancelar'}
              </button>
              {previewData?.tarifas_configuradas && !genMsg && (
                <button
                  onClick={confirmarGenerar}
                  disabled={genLoading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl py-2.5 text-sm font-medium transition-colors"
                >
                  {genLoading ? 'Generando…' : 'Confirmar y generar'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
