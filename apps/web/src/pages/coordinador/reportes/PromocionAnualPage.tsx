import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../../lib/api'
import { SelectGestion }  from '../../../components/select/SelectGestion'
import { SelectParalelo } from '../../../components/select/SelectParalelo'

interface NotaMateria {
  materia: string
  t1: number | null; t2: number | null; t3: number | null
  promedio_anual: number
  resultado: 'APROBADO' | 'REPROBADO'
}
interface EstRow {
  estudiante:         { nombre: string; apellido: string; codigo: string }
  notas_por_materia:  NotaMateria[]
  resultado_final:    'PROMOVIDO' | 'REPITE'
  materias_reprobadas: string[]
}

export default function PromocionAnualPage() {
  const [gestionId,  setGestionId]  = useState('')
  const [paraleloId, setParaleloId] = useState('')
  const [data,       setData]       = useState<EstRow[] | null>(null)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [expanded,   setExpanded]   = useState<string | null>(null)

  async function cargar() {
    if (!gestionId || !paraleloId) return
    setLoading(true); setError(null)
    try {
      const res = await api.get<EstRow[]>(`/reportes/promocion-anual?paralelo_id=${paraleloId}&gestion_id=${gestionId}`)
      setData(res)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar')
    } finally { setLoading(false) }
  }

  const promovidos  = data?.filter(e => e.resultado_final === 'PROMOVIDO').length ?? 0
  const repiten     = (data?.length ?? 0) - promovidos

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link to=".." className="text-sm text-blue-600 hover:underline">← Reportes</Link>
        <h1 className="text-xl font-bold text-gray-900">🎓 Resultado Final / Promoción</h1>
      </div>

      <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
        ⚠️ Este reporte solo está disponible cuando los 3 trimestres de la gestión están <strong>cerrados</strong>.
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SelectGestion  value={gestionId}  onChange={id => { setGestionId(id); setData(null) }} />
          <SelectParalelo value={paraleloId} onChange={setParaleloId} />
          <div className="flex items-end">
            <button
              onClick={cargar}
              disabled={!gestionId || !paraleloId || loading}
              className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Calculando…' : 'Calcular'}
            </button>
          </div>
        </div>
      </div>

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {data && (
        <div className="space-y-4">
          {/* Resumen */}
          <div className="flex gap-4">
            <div className="rounded-xl bg-green-50 border border-green-200 px-5 py-3 text-center flex-1">
              <div className="text-2xl font-bold text-green-700">{promovidos}</div>
              <div className="text-sm text-green-600">Promovidos</div>
            </div>
            <div className="rounded-xl bg-red-50 border border-red-200 px-5 py-3 text-center flex-1">
              <div className="text-2xl font-bold text-red-700">{repiten}</div>
              <div className="text-sm text-red-600">Repiten</div>
            </div>
            <div className="rounded-xl bg-gray-50 border border-gray-200 px-5 py-3 text-center flex-1">
              <div className="text-2xl font-bold text-gray-700">{data.length}</div>
              <div className="text-sm text-gray-500">Total</div>
            </div>
          </div>

          {/* Tabla */}
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-[#1F3864] text-white">
                  <th className="px-3 py-2 text-left">Apellidos y Nombres</th>
                  <th className="px-2 py-2 text-center">T1</th>
                  <th className="px-2 py-2 text-center">T2</th>
                  <th className="px-2 py-2 text-center">T3</th>
                  <th className="px-2 py-2 text-center">Prom. Anual</th>
                  <th className="px-3 py-2 text-center">Resultado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.map(est => {
                  const key = est.estudiante.codigo
                  const avgByTrim = [1, 2, 3].map(t => {
                    const vals = est.notas_por_materia.map(n => t === 1 ? n.t1 : t === 2 ? n.t2 : n.t3).filter((v): v is number => v !== null)
                    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null
                  })
                  const avgAnual = Math.round(est.notas_por_materia.reduce((s, n) => s + n.promedio_anual, 0) / est.notas_por_materia.length)

                  return (
                    <>
                      <tr
                        key={key}
                        className={`cursor-pointer hover:bg-gray-50 ${est.resultado_final === 'REPITE' ? 'bg-red-50' : ''}`}
                        onClick={() => setExpanded(expanded === key ? null : key)}
                      >
                        <td className="px-3 py-2">
                          <div className="font-medium">{est.estudiante.apellido} {est.estudiante.nombre}</div>
                          {est.resultado_final === 'REPITE' && (
                            <div className="text-xs text-red-600 mt-0.5">{est.materias_reprobadas.join(', ')}</div>
                          )}
                        </td>
                        <td className="px-2 py-2 text-center">{avgByTrim[0] ?? '—'}</td>
                        <td className="px-2 py-2 text-center">{avgByTrim[1] ?? '—'}</td>
                        <td className="px-2 py-2 text-center">{avgByTrim[2] ?? '—'}</td>
                        <td className="px-2 py-2 text-center font-bold">{avgAnual}</td>
                        <td className="px-3 py-2 text-center">
                          <span className={`rounded-full px-3 py-1 text-xs font-bold ${est.resultado_final === 'PROMOVIDO' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {est.resultado_final}
                          </span>
                        </td>
                      </tr>
                      {expanded === key && (
                        <tr key={`${key}-detail`}>
                          <td colSpan={6} className="bg-gray-50 px-4 py-3">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-gray-500">
                                  <th className="text-left py-1">Materia</th>
                                  <th className="text-center py-1">T1</th>
                                  <th className="text-center py-1">T2</th>
                                  <th className="text-center py-1">T3</th>
                                  <th className="text-center py-1">Promedio</th>
                                  <th className="text-center py-1">Resultado</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {est.notas_por_materia.map((n, i) => (
                                  <tr key={i} className={n.resultado === 'REPROBADO' ? 'text-red-600' : ''}>
                                    <td className="py-1">{n.materia}</td>
                                    <td className="text-center py-1">{n.t1 ?? '—'}</td>
                                    <td className="text-center py-1">{n.t2 ?? '—'}</td>
                                    <td className="text-center py-1">{n.t3 ?? '—'}</td>
                                    <td className="text-center py-1 font-semibold">{n.promedio_anual}</td>
                                    <td className="text-center py-1 font-medium">
                                      {n.resultado === 'APROBADO' ? '✓' : '✗ Reprobado'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400">Haz clic en una fila para ver el detalle por materia.</p>
        </div>
      )}
    </div>
  )
}
