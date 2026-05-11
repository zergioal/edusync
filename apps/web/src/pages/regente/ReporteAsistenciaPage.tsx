import { useState, useEffect, useRef } from 'react'
import { api } from '../../lib/api'
import { useGestionActiva } from '../../hooks/useGestionActiva'
import { useToast } from '../../components/ui/Toast'
import { Spinner, Badge } from '@edusync/ui'

interface Paralelo { id: string; nombre: string; nivel: string }

interface RowReporte {
  estudiante_id:          string
  nombre:                 string
  apellido:               string
  presentes:              number
  ausentes:               number
  tardanzas:              number
  total:                  number
  porcentaje_asistencia:  number | null
}

export default function ReporteAsistenciaPage() {
  const toast    = useToast()
  const toastRef = useRef(toast)
  toastRef.current = toast
  const { trimestreActual } = useGestionActiva()

  const [paralelos,  setParalelos]  = useState<Paralelo[]>([])
  const [paraleloId, setParaleloId] = useState('')
  const [filas,      setFilas]      = useState<RowReporte[]>([])
  const [loading,    setLoading]    = useState(false)
  const [fechaIni,   setFechaIni]   = useState('')
  const [fechaFin,   setFechaFin]   = useState('')

  useEffect(() => {
    api.get<Paralelo[]>('/asistencia/paralelos-regente')
      .then(setParalelos)
      .catch(() => toastRef.current.error('Error al cargar paralelos'))
  }, [])

  useEffect(() => {
    if (trimestreActual) {
      setFechaIni(trimestreActual.fecha_inicio.slice(0, 10))
      setFechaFin(trimestreActual.fecha_fin.slice(0, 10))
    }
  }, [trimestreActual])

  async function buscar() {
    if (!paraleloId || !fechaIni || !fechaFin) return
    setLoading(true)
    try {
      const data = await api.get<RowReporte[]>(
        `/asistencia/diaria/reporte?paralelo_id=${paraleloId}&fecha_inicio=${fechaIni}&fecha_fin=${fechaFin}`,
      )
      setFilas(data)
    } catch {
      toastRef.current.error('Error al generar reporte')
    } finally {
      setLoading(false)
    }
  }

  function exportarCSV() {
    if (filas.length === 0) return
    const header = ['Apellido', 'Nombre', 'Presentes', 'Ausentes', 'Tardanzas', 'Total', '% Asistencia']
    const rows = filas.map(f => [
      f.apellido, f.nombre, f.presentes, f.ausentes, f.tardanzas, f.total,
      f.porcentaje_asistencia !== null ? `${f.porcentaje_asistencia}%` : 'N/A',
    ])
    const csv = [header, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `reporte-asistencia-${paraleloId}-${fechaIni}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reporte de Asistencia</h1>
          <p className="text-sm text-gray-500 mt-0.5">Resumen por paralelo y período</p>
        </div>
        {filas.length > 0 && (
          <button
            onClick={exportarCSV}
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Exportar CSV
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Paralelo</label>
          <select
            value={paraleloId}
            onChange={e => setParaleloId(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">— Seleccionar —</option>
            {paralelos.map(p => <option key={p.id} value={p.id}>{p.nombre} ({p.nivel})</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Desde</label>
          <input type="date" value={fechaIni} onChange={e => setFechaIni(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Hasta</label>
          <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="flex items-end">
          <button
            onClick={buscar}
            disabled={!paraleloId || !fechaIni || !fechaFin}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Generar
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : filas.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">
            Selecciona un paralelo y un período para ver el reporte
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="px-5 py-3 text-left">Estudiante</th>
                <th className="px-5 py-3 text-center">Presentes</th>
                <th className="px-5 py-3 text-center">Ausencias</th>
                <th className="px-5 py-3 text-center">Tardanzas</th>
                <th className="px-5 py-3 text-center">Total días</th>
                <th className="px-5 py-3 text-center">% Asistencia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filas.map(f => {
                const pct = f.porcentaje_asistencia
                return (
                  <tr key={f.estudiante_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 font-medium text-gray-900">{f.apellido}, {f.nombre}</td>
                    <td className="px-5 py-3 text-center text-green-700 font-semibold">{f.presentes}</td>
                    <td className="px-5 py-3 text-center text-red-600 font-semibold">{f.ausentes}</td>
                    <td className="px-5 py-3 text-center text-amber-600 font-semibold">{f.tardanzas}</td>
                    <td className="px-5 py-3 text-center text-gray-600">{f.total}</td>
                    <td className="px-5 py-3 text-center">
                      {pct === null ? (
                        <span className="text-gray-400">N/A</span>
                      ) : (
                        <Badge variant={pct >= 85 ? 'success' : pct >= 70 ? 'warning' : 'danger'}>
                          {pct}%
                        </Badge>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {filas.length > 0 && (
        <p className="text-xs text-gray-400 text-center">
          Alerta: porcentaje &lt; 85% se marca en amarillo · &lt; 70% en rojo
        </p>
      )}
    </div>
  )
}
