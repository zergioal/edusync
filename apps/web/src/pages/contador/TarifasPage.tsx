import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { api, ApiError } from '../../lib/api'

interface Gestion { id: string; anno: number }
interface Nivel   { id: string; nombre: string }

interface TarifaRow {
  id:           string
  nivel_id:     string
  nivel_nombre: string
  monto:        number
  gestion_id:   string
  sugerida:     boolean
  estudiantes_count?: number
}

interface TarifasResponse {
  tarifas:               TarifaRow[]
  sugeridas:             boolean
  becados_count?:        number
  gestion_anno_sugerida: number | null
}

export default function TarifasPage() {
  const [gestiones,    setGestiones]    = useState<Gestion[]>([])
  const [niveles,      setNiveles]      = useState<Nivel[]>([])
  const [gestionId,    setGestionId]    = useState('')
  const [data,         setData]         = useState<TarifasResponse | null>(null)
  const [montos,       setMontos]       = useState<Record<string, string>>({})
  const [loading,      setLoading]      = useState(false)
  const [saving,       setSaving]       = useState(false)
  const [msg,          setMsg]          = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  useEffect(() => {
    api.get<Gestion[]>('/gestiones').then(gs => {
      setGestiones(gs)
      if (gs[0]) setGestionId(gs[0].id)
    }).catch(() => {})
    api.get<Nivel[]>('/niveles').then(setNiveles).catch(() => {})
  }, [])

  const load = useCallback(async () => {
    if (!gestionId) return
    setLoading(true)
    setMsg(null)
    try {
      const res = await api.get<TarifasResponse>(`/tarifas?gestion_id=${gestionId}`)
      setData(res)
      // Pre-fill montos
      const m: Record<string, string> = {}
      for (const t of res.tarifas) {
        m[t.nivel_id] = String(t.monto)
      }
      // Fill any missing niveles with empty
      for (const n of niveles) {
        if (!(n.id in m)) m[n.id] = ''
      }
      setMontos(m)
    } catch {
      setMsg({ type: 'err', text: 'No se pudo cargar las tarifas' })
    } finally {
      setLoading(false)
    }
  }, [gestionId, niveles])

  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    const items = Object.entries(montos)
      .filter(([, v]) => v !== '' && !isNaN(Number(v)) && Number(v) > 0)
      .map(([nivel_id, v]) => ({ nivel_id, monto: Number(v) }))

    if (items.length === 0) {
      setMsg({ type: 'err', text: 'Ingresa al menos un monto válido' })
      return
    }
    setSaving(true)
    setMsg(null)
    try {
      await api.post('/tarifas', { gestion_id: gestionId, tarifas: items })
      setMsg({ type: 'ok', text: 'Tarifas guardadas correctamente' })
      load()
    } catch (e) {
      setMsg({ type: 'err', text: e instanceof ApiError ? e.message : 'Error al guardar' })
    } finally {
      setSaving(false)
    }
  }

  const gestionAnno = gestiones.find(g => g.id === gestionId)?.anno

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/dashboard/admin/finanzas"
          className="text-gray-400 hover:text-gray-700 transition-colors text-sm">
          ← Pensiones
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Tarifas de Pensión</h1>
      </div>

      {/* Selector gestión */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Gestión</label>
        <select
          value={gestionId}
          onChange={e => setGestionId(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          {gestiones.map(g => <option key={g.id} value={g.id}>Gestión {g.anno}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-400 text-sm">Cargando…</div>
      ) : (
        <>
          {/* Banner sugeridas */}
          {data?.sugeridas && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 flex gap-3">
              <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
              </svg>
              <div>
                <p className="text-sm font-semibold text-amber-800">
                  No hay tarifas para la gestión {gestionAnno}
                </p>
                <p className="text-sm text-amber-700 mt-0.5">
                  Se muestran los montos sugeridos de la gestión {data.gestion_anno_sugerida}.
                  Ajústalos y guarda para confirmarlos para {gestionAnno}.
                </p>
              </div>
            </div>
          )}

          {/* Banner sin tarifas ni sugerencias */}
          {data && !data.sugeridas && data.tarifas.length === 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 flex gap-3">
              <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
              </svg>
              <div>
                <p className="text-sm font-semibold text-red-800">Tarifas no configuradas</p>
                <p className="text-sm text-red-700 mt-0.5">
                  No podrás generar pensiones hasta que definas al menos una tarifa para la gestión {gestionAnno}.
                </p>
              </div>
            </div>
          )}

          {/* Formulario */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700">Monto mensual por nivel</h2>
              <p className="text-xs text-gray-400 mt-0.5">El monto se congela al generar las pensiones del mes (RN-13)</p>
            </div>

            <div className="divide-y divide-gray-50">
              {niveles.map(nivel => {
                const tarifa = data?.tarifas.find(t => t.nivel_id === nivel.id)
                return (
                  <div key={nivel.id} className="flex items-center justify-between px-5 py-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{nivel.nombre}</p>
                      {tarifa?.estudiantes_count !== undefined && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {tarifa.estudiantes_count} estudiante{tarifa.estudiantes_count !== 1 ? 's' : ''} matriculado{tarifa.estudiantes_count !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">Bs.</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={montos[nivel.id] ?? ''}
                        onChange={e => setMontos(prev => ({ ...prev, [nivel.id]: e.target.value }))}
                        placeholder="0.00"
                        className="w-28 border border-gray-300 rounded-lg px-3 py-2 text-sm text-right font-mono focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Stats becados */}
            {data && !data.sugeridas && data.becados_count !== undefined && data.becados_count > 0 && (
              <div className="border-t border-gray-100 px-5 py-3 bg-amber-50 flex items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">BECA</span>
                <p className="text-sm text-amber-700">
                  {data.becados_count} estudiante{data.becados_count !== 1 ? 's' : ''} becado{data.becados_count !== 1 ? 's' : ''} — exento{data.becados_count !== 1 ? 's' : ''} del pago de pensiones
                </p>
              </div>
            )}

            <div className="border-t border-gray-100 px-5 py-4 flex items-center justify-between">
              {msg ? (
                <span className={`text-sm font-medium ${msg.type === 'ok' ? 'text-green-600' : 'text-red-600'}`}>
                  {msg.text}
                </span>
              ) : <span />}
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
              >
                {saving ? 'Guardando…' : 'Guardar tarifas'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
