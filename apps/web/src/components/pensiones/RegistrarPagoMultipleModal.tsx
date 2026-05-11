import { useState, useEffect } from 'react'
import { api } from '../../lib/api'

const MESES_NOMBRES = [
  '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

interface PensionPendiente {
  id:         string
  mes:        number
  nombre_mes: string
  monto:      number
}

interface Props {
  estudianteId: string
  nombre:       string
  apellido:     string
  codigo:       string
  gestionId:    string
  onClose:      () => void
  onSuccess:    () => void
}

export function RegistrarPagoMultipleModal({
  estudianteId, nombre, apellido, codigo, gestionId, onClose, onSuccess,
}: Props) {
  const hoy = new Date().toISOString().split('T')[0]!

  const [pensiones,   setPensiones]   = useState<PensionPendiente[]>([])
  const [selected,    setSelected]    = useState<Set<string>>(new Set())
  const [loadingList, setLoadingList] = useState(true)
  const [fecha,       setFecha]       = useState(hoy)
  const [comprobante, setComp]        = useState('')
  const [saving,      setSaving]      = useState(false)
  const [results,     setResults]     = useState<{ mes: number; ok: boolean; err?: string }[] | null>(null)
  const [error,       setError]       = useState<string | null>(null)

  useEffect(() => {
    api.get<Array<{ id: string; mes: number; nombre_mes: string; monto: number }>>(
      `/pensiones?gestion_id=${gestionId}&estudiante_id=${estudianteId}&estado=pendiente`,
    )
      .then(rows => {
        const sorted = [...rows].sort((a, b) => a.mes - b.mes)
        setPensiones(sorted)
        setSelected(new Set(sorted.map(p => p.id)))
      })
      .catch(() => setError('No se pudieron cargar las mensualidades pendientes'))
      .finally(() => setLoadingList(false))
  }, [estudianteId, gestionId])

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === pensiones.length) setSelected(new Set())
    else setSelected(new Set(pensiones.map(p => p.id)))
  }

  const seleccionadas  = pensiones.filter(p => selected.has(p.id))
  const montoTotal     = seleccionadas.reduce((s, p) => s + p.monto, 0)
  const allSelected    = pensiones.length > 0 && selected.size === pensiones.length

  async function submit() {
    if (!comprobante.trim()) { setError('Ingresa el número de comprobante'); return }
    if (selected.size === 0) { setError('Selecciona al menos un mes'); return }
    setSaving(true)
    setError(null)
    const res: { mes: number; ok: boolean; err?: string }[] = []
    for (const p of seleccionadas) {
      try {
        await api.put(`/pensiones/${p.id}/pagar`, { fecha_pago: fecha, comprobante: comprobante.trim() })
        res.push({ mes: p.mes, ok: true })
      } catch (e: unknown) {
        res.push({ mes: p.mes, ok: false, err: e instanceof Error ? e.message : 'Error' })
      }
    }
    setResults(res)
    setSaving(false)
    if (res.every(r => r.ok)) onSuccess()
  }

  const allOk = results?.every(r => r.ok)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="bg-green-600 px-6 py-4 text-white flex-shrink-0">
          <h2 className="text-base font-bold">Registrar pago de pensiones</h2>
          <p className="text-green-100 text-sm mt-0.5">
            {apellido} {nombre} — {codigo}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          {/* Resultados finales */}
          {results && (
            <div className="space-y-2">
              <p className={`text-sm font-semibold ${allOk ? 'text-green-700' : 'text-orange-700'}`}>
                {allOk ? 'Todos los pagos fueron registrados.' : 'Algunos pagos no pudieron registrarse.'}
              </p>
              {results.map(r => (
                <div key={r.mes} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${r.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  <span className="font-medium w-5 text-center">{r.ok ? '✓' : '✗'}</span>
                  <span>{MESES_NOMBRES[r.mes]}</span>
                  {r.err && <span className="text-xs ml-auto opacity-75">{r.err}</span>}
                </div>
              ))}
              <button
                onClick={onClose}
                className="w-full mt-2 border border-gray-300 rounded-xl py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cerrar
              </button>
            </div>
          )}

          {!results && (
            <>
              {/* Lista de meses pendientes */}
              {loadingList ? (
                <div className="py-6 text-center text-sm text-gray-400">Cargando mensualidades…</div>
              ) : pensiones.length === 0 ? (
                <div className="py-6 text-center text-sm text-gray-400">
                  Este estudiante no tiene mensualidades pendientes.
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-gray-700">Meses pendientes</p>
                    <button
                      onClick={toggleAll}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      {allSelected ? 'Deseleccionar todos' : 'Seleccionar todos'}
                    </button>
                  </div>
                  <div className="space-y-1.5 rounded-xl border border-gray-200 overflow-hidden">
                    {pensiones.map(p => (
                      <label
                        key={p.id}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-100 last:border-0"
                      >
                        <input
                          type="checkbox"
                          checked={selected.has(p.id)}
                          onChange={() => toggle(p.id)}
                          className="h-4 w-4 rounded accent-green-600"
                        />
                        <span className="flex-1 text-sm font-medium text-gray-800">
                          {MESES_NOMBRES[p.mes]}
                        </span>
                        <span className="text-sm font-semibold text-gray-900">
                          Bs. {p.monto.toFixed(2)}
                        </span>
                      </label>
                    ))}
                  </div>

                  {/* Total seleccionado */}
                  {selected.size > 0 && (
                    <div className="mt-2 flex items-center justify-between rounded-lg bg-green-50 border border-green-200 px-4 py-2">
                      <span className="text-sm text-green-700 font-medium">
                        {selected.size} {selected.size === 1 ? 'mes' : 'meses'} seleccionados
                      </span>
                      <span className="text-base font-bold text-green-800">
                        Bs. {montoTotal.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Campos de pago */}
              {pensiones.length > 0 && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de pago</label>
                    <input
                      type="date"
                      value={fecha}
                      max={hoy}
                      onChange={e => setFecha(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      N° de comprobante
                      <span className="ml-1 text-xs font-normal text-gray-400">(aplica a todos los meses)</span>
                    </label>
                    <input
                      type="text"
                      value={comprobante}
                      onChange={e => setComp(e.target.value)}
                      placeholder="Ej: 001234"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>
              )}

              <p className="text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2">
                El acceso académico se restaura automáticamente al registrar el pago.
              </p>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
              )}

              {/* Acciones */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={onClose}
                  className="flex-1 border border-gray-300 rounded-xl py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                {pensiones.length > 0 && (
                  <button
                    onClick={submit}
                    disabled={saving || selected.size === 0}
                    className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-medium transition-colors"
                  >
                    {saving
                      ? 'Registrando…'
                      : `Confirmar ${selected.size === 1 ? '1 mes' : `${selected.size} meses`}`
                    }
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
