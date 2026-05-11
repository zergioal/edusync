import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../../lib/api'
import { SelectGestion }   from '../../../components/select/SelectGestion'
import { SelectTrimestre } from '../../../components/select/SelectTrimestre'
import { SelectParalelo }  from '../../../components/select/SelectParalelo'

interface Parcial {
  indicador:            { nombre: string; fecha_aplicacion: string }
  entregado:            boolean
  estudiantes_sin_nota: number
}
interface DocenteRow {
  docente:          { nombre: string; apellido: string }
  materia:          { nombre: string }
  parciales:        Parcial[]
  todos_entregados: boolean
}

export default function ParcialesPage() {
  const [gestionId,   setGestionId]   = useState('')
  const [trimestreId, setTrimestreId] = useState('')
  const [paraleloId,  setParaleloId]  = useState('')
  const [data,        setData]        = useState<DocenteRow[] | null>(null)
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState<string | null>(null)

  async function cargar() {
    if (!trimestreId || !paraleloId) return
    setLoading(true); setError(null)
    try {
      const res = await api.get<DocenteRow[]>(`/reportes/parciales?trimestre_id=${trimestreId}&paralelo_id=${paraleloId}`)
      setData(res)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar')
    } finally { setLoading(false) }
  }

  const pendientes = data?.filter(d => !d.todos_entregados).length ?? 0

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link to=".." className="text-sm text-blue-600 hover:underline">← Reportes</Link>
        <h1 className="text-xl font-bold text-gray-900">📋 Estado de Parciales</h1>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
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
        <>
          {pendientes > 0 && (
            <div className="rounded-lg bg-orange-50 border border-orange-200 p-3 text-sm text-orange-800">
              ⚠️ {pendientes} docente{pendientes > 1 ? 's' : ''} con parciales pendientes de entrega.
            </div>
          )}
          {pendientes === 0 && (
            <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-800">
              ✅ Todos los docentes han entregado sus parciales.
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {data.map((row, i) => (
              <div key={i} className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold text-gray-900">
                      {row.docente.apellido} {row.docente.nombre}
                    </div>
                    <div className="text-sm text-gray-500">{row.materia.nombre}</div>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${row.todos_entregados ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                    {row.todos_entregados ? '✓ Completo' : `Faltan ${row.parciales.filter(p => !p.entregado).length}`}
                  </span>
                </div>
                {row.parciales.length === 0 ? (
                  <p className="text-sm text-gray-400">Sin parciales en este trimestre.</p>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {row.parciales.map((p, j) => (
                      <div key={j} className="flex items-center justify-between py-1.5 text-sm">
                        <div>
                          <span className="font-medium">{p.indicador.nombre}</span>
                          <span className="ml-2 text-xs text-gray-400">
                            {new Date(p.indicador.fecha_aplicacion).toLocaleDateString('es-BO')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {p.estudiantes_sin_nota > 0 && (
                            <span className="text-xs text-gray-400">{p.estudiantes_sin_nota} sin nota</span>
                          )}
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${p.entregado ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                            {p.entregado ? 'Entregado' : 'Pendiente'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
