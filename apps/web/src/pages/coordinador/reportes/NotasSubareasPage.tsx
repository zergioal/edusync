import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api, apiDownload } from '../../../lib/api'
import { SelectGestion }   from '../../../components/select/SelectGestion'
import { SelectTrimestre } from '../../../components/select/SelectTrimestre'
import { SelectParalelo }  from '../../../components/select/SelectParalelo'

interface EstudianteRow {
  codigo: string; apellido: string; nombre: string
  notasSubareas: Array<{ nombre: string; total: number }>
  promedio: number
}
interface Resultado {
  curso: string
  subareas: string[]
  estudiantes: EstudianteRow[]
}

export default function NotasSubareasPage() {
  const [gestionId,   setGestionId]   = useState('')
  const [trimestreId, setTrimestreId] = useState('')
  const [paraleloId,  setParaleloId]  = useState('')
  const [data,        setData]        = useState<Resultado | null>(null)
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [descargando, setDescargando] = useState<'pdf' | 'excel' | null>(null)

  async function generar() {
    if (!paraleloId || !trimestreId) return
    setLoading(true); setError(null)
    try {
      const res = await api.get<Resultado>(`/reportes/bth/notas-subareas?paralelo_id=${paraleloId}&trimestre_id=${trimestreId}`)
      setData(res)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar')
    } finally { setLoading(false) }
  }

  async function descargar(tipo: 'pdf' | 'excel') {
    setDescargando(tipo)
    try {
      await apiDownload(
        `/reportes/bth/notas-subareas/${tipo}?paralelo_id=${paraleloId}&trimestre_id=${trimestreId}`,
        `notas_subareas_bth.${tipo === 'pdf' ? 'pdf' : 'xlsx'}`,
      )
    } finally { setDescargando(null) }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link to=".." className="text-sm text-blue-600 hover:underline">← Reportes</Link>
        <h1 className="text-xl font-bold text-fg">Notas de Subáreas — BTH</h1>
      </div>

      <div className="rounded-xl border border-border bg-surface p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <SelectGestion   value={gestionId}   onChange={id => { setGestionId(id); setTrimestreId(''); setData(null) }} />
          <SelectTrimestre value={trimestreId} onChange={setTrimestreId} gestionId={gestionId} />
          <SelectParalelo  value={paraleloId}  onChange={setParaleloId} nivelesPermitidos={['SECUNDARIA']} gradoOrdenes={[5, 6]} label="Curso (5to o 6to)" />
          <div className="flex items-end">
            <button
              onClick={generar}
              disabled={!paraleloId || !trimestreId || loading}
              className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Generando…' : 'Generar'}
            </button>
          </div>
        </div>
      </div>

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {data && (
        <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="font-semibold text-fg">{data.curso}</div>
              <div className="text-sm text-fg-muted">{data.estudiantes.length} estudiante(s) que cursan BTH</div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => descargar('pdf')} disabled={!!descargando}
                className="rounded-lg border border-blue-600 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50">
                {descargando === 'pdf' ? 'Descargando…' : 'PDF'}
              </button>
              <button onClick={() => descargar('excel')} disabled={!!descargando}
                className="rounded-lg border border-green-600 px-3 py-1.5 text-sm font-medium text-green-700 hover:bg-green-50 disabled:opacity-50">
                {descargando === 'excel' ? 'Descargando…' : 'Excel'}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-[#1F3864] text-white">
                  <th className="px-3 py-2 text-left">Apellidos y Nombres</th>
                  {data.subareas.map((s, i) => <th key={i} className="px-2 py-2 text-center">{s}</th>)}
                  <th className="px-3 py-2 text-center">Promedio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.estudiantes.length === 0 && (
                  <tr><td colSpan={data.subareas.length + 2} className="text-center py-6 text-fg-muted">Sin estudiantes que cursen BTH en este curso</td></tr>
                )}
                {data.estudiantes.map(est => (
                  <tr key={est.codigo} className="hover:bg-surface-2">
                    <td className="px-3 py-2 font-medium">{est.apellido}, {est.nombre}</td>
                    {est.notasSubareas.map((n, i) => (
                      <td key={i} className={`px-2 py-2 text-center ${n.total === 50 ? 'text-amber-600 font-bold' : ''}`}>{n.total}</td>
                    ))}
                    <td className="px-3 py-2 text-center font-bold">{est.promedio}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
