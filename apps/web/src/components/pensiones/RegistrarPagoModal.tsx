import { useState } from 'react'
import { api } from '../../lib/api'

interface Props {
  pension: {
    id:       string
    mes:      number
    nombre_mes: string
    monto:    number
    estudiante: { nombre: string; apellido: string; codigo: string }
  }
  onClose:   () => void
  onSuccess: () => void
}

export function RegistrarPagoModal({ pension, onClose, onSuccess }: Props) {
  const hoy = new Date().toISOString().split('T')[0]!
  const [fecha_pago,  setFecha]   = useState(hoy)
  const [comprobante, setComp]    = useState('')
  const [saving,      setSaving]  = useState(false)
  const [error,       setError]   = useState<string | null>(null)

  const submit = async () => {
    if (!comprobante.trim()) { setError('Ingresa el número de comprobante'); return }
    setSaving(true)
    setError(null)
    try {
      await api.put(`/pensiones/${pension.id}/pagar`, { fecha_pago, comprobante: comprobante.trim() })
      onSuccess()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al registrar el pago')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-green-600 px-6 py-4 text-white">
          <h2 className="text-lg font-bold">Registrar pago</h2>
          <p className="text-green-100 text-sm">{pension.nombre_mes} — Pensión escolar</p>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Info estudiante */}
          <div className="bg-gray-50 rounded-xl p-3 space-y-1">
            <p className="text-sm font-semibold text-gray-800">
              {pension.estudiante.apellido} {pension.estudiante.nombre}
            </p>
            <p className="text-xs text-gray-500">Código: {pension.estudiante.codigo}</p>
            <p className="text-lg font-bold text-gray-900 mt-1">Bs. {pension.monto.toFixed(2)}</p>
          </div>

          {/* Campos */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de pago</label>
              <input
                type="date"
                value={fecha_pago}
                max={hoy}
                onChange={e => setFecha(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">N° de comprobante</label>
              <input
                type="text"
                value={comprobante}
                onChange={e => setComp(e.target.value)}
                placeholder="Ej: 001234"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          {/* Nota */}
          <p className="text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2">
            El acceso académico se restaura automáticamente al registrar el pago.
          </p>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              className="flex-1 border border-gray-300 rounded-xl py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={submit}
              disabled={saving}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white rounded-xl py-2.5 text-sm font-medium transition-colors"
            >
              {saving ? 'Registrando…' : 'Confirmar pago'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
