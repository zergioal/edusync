import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../../lib/api'
import { SelectGestion }   from '../../../components/select/SelectGestion'
import { SelectTrimestre } from '../../../components/select/SelectTrimestre'
import { SelectParalelo }  from '../../../components/select/SelectParalelo'

interface Carpeta {
  posicion_lista: number
  estudiante:     { nombre: string; apellido: string; codigo: string }
  puede_recibir:  boolean
  motivo_bloqueo: string | null
}

export default function CarpetasPage() {
  const [gestionId,   setGestionId]   = useState('')
  const [trimestreId, setTrimestreId] = useState('')
  const [paraleloId,  setParaleloId]  = useState('')
  const [data,        setData]        = useState<Carpeta[] | null>(null)
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState<string | null>(null)

  async function cargar() {
    if (!trimestreId || !paraleloId) return
    setLoading(true); setError(null)
    try {
      const res = await api.get<Carpeta[]>(`/reportes/carpetas-entregables?trimestre_id=${trimestreId}&paralelo_id=${paraleloId}`)
      setData(res)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar')
    } finally { setLoading(false) }
  }

  function imprimir() { window.print() }

  const puedenRecibir = data?.filter(c => c.puede_recibir).length ?? 0
  const noReciben     = (data?.length ?? 0) - puedenRecibir

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link to=".." className="text-sm text-blue-600 hover:underline">← Reportes</Link>
        <h1 className="text-xl font-bold text-gray-900">📁 Carpetas Entregables</h1>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 print:hidden">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <SelectGestion   value={gestionId}   onChange={id => { setGestionId(id); setTrimestreId('') }} />
          <SelectTrimestre value={trimestreId} onChange={setTrimestreId} gestionId={gestionId} />
          <SelectParalelo  value={paraleloId}  onChange={setParaleloId} />
          <div className="flex items-end">
            <button
              onClick={cargar}
              disabled={!paraleloId || !trimestreId || loading}
              className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Cargando…' : 'Consultar'}
            </button>
          </div>
        </div>
      </div>

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {data && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3 print:hidden">
            <div className="flex gap-4 text-sm">
              <span className="text-green-700 font-medium">✓ {puedenRecibir} entrega carpeta</span>
              <span className="text-red-600 font-medium">✗ {noReciben} no entrega</span>
              <span className="text-gray-500">Total: {data.length}</span>
            </div>
            <button
              onClick={imprimir}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              🖨️ Imprimir lista
            </button>
          </div>

          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-[#1F3864] text-white">
                <th className="px-3 py-2 text-center w-12">N°</th>
                <th className="px-3 py-2 text-left">Apellidos y Nombres</th>
                <th className="px-3 py-2 text-center w-16">Código</th>
                <th className="px-3 py-2 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map(c => (
                <tr key={c.estudiante.codigo} className={c.puede_recibir ? 'bg-white' : 'bg-red-50'}>
                  <td className="px-3 py-2 text-center text-gray-500">{c.posicion_lista}</td>
                  <td className="px-3 py-2 font-medium">
                    {c.estudiante.apellido} {c.estudiante.nombre}
                  </td>
                  <td className="px-3 py-2 text-center text-xs text-gray-500">{c.estudiante.codigo}</td>
                  <td className="px-3 py-2 text-center">
                    {c.puede_recibir ? (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                        ✓ Entrega su carpeta
                      </span>
                    ) : (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600" title={c.motivo_bloqueo ?? ''}>
                        ✗ {c.motivo_bloqueo ?? 'No puede recibir'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
