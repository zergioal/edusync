import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api, apiDownload } from '../../../lib/api'
import { SelectGestion }   from '../../../components/select/SelectGestion'
import { SelectTrimestre } from '../../../components/select/SelectTrimestre'
import { SelectParalelo }  from '../../../components/select/SelectParalelo'

type Escala = 'ED' | 'DA' | 'DO' | 'DP'
interface Estudiante {
  posicion:          number
  nombre:            string
  apellido:          string
  codigo:            string
  promedios_materia: number[]
  promedio_general:  number
  escala_general:    Escala
  materias_reprobadas: number
}
interface Resultado {
  paralelo: string; grado: string; nivel: string; trimestre: number; anno: number
  materias: Array<{ nombre: string }>
  estudiantes: Estudiante[]
}

function badgeColor(e: Escala) {
  if (e === 'ED') return 'bg-red-100 text-red-700'
  if (e === 'DA') return 'bg-orange-100 text-orange-700'
  if (e === 'DO') return 'bg-green-100 text-green-600'
  return 'bg-emerald-100 text-emerald-700'
}

const MEDAL = ['🥇', '🥈', '🥉']

export default function CuadroHonorPage() {
  const [gestionId,   setGestionId]   = useState('')
  const [trimestreId, setTrimestreId] = useState('')
  const [paraleloId,  setParaleloId]  = useState('')
  const [data,        setData]        = useState<Resultado | null>(null)
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)

  async function generar() {
    if (!paraleloId || !trimestreId) return
    setLoading(true); setError(null)
    try {
      const res = await api.get<Resultado>(`/reportes/cuadro-honor?paralelo_id=${paraleloId}&trimestre_id=${trimestreId}`)
      setData(res)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar')
    } finally {
      setLoading(false)
    }
  }

  async function descargarPdf() {
    if (!paraleloId || !trimestreId || !data) return
    setDownloading(true)
    try {
      await apiDownload(
        `/reportes/cuadro-honor/pdf?paralelo_id=${paraleloId}&trimestre_id=${trimestreId}`,
        `cuadro_honor_T${data.trimestre}.pdf`,
      )
    } finally { setDownloading(false) }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link to=".." className="text-sm text-blue-600 hover:underline">← Reportes</Link>
        <h1 className="text-xl font-bold text-gray-900">🏆 Cuadro de Honor</h1>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <SelectGestion   value={gestionId}   onChange={id => { setGestionId(id); setTrimestreId(''); setData(null) }} />
          <SelectTrimestre value={trimestreId} onChange={setTrimestreId} gestionId={gestionId} />
          <SelectParalelo  value={paraleloId}  onChange={setParaleloId} />
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
        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="font-semibold text-gray-900">
                {data.nivel} – {data.grado} "{data.paralelo}"
              </div>
              <div className="text-sm text-gray-500">
                Trimestre {data.trimestre}° · Gestión {data.anno} · {data.estudiantes.length} estudiantes
              </div>
            </div>
            <button
              onClick={descargarPdf}
              disabled={downloading}
              className="rounded-lg border border-blue-600 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50"
            >
              {downloading ? 'Descargando…' : '📄 Descargar PDF'}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-[#1F3864] text-white">
                  <th className="px-3 py-2 text-center w-12">Pos.</th>
                  <th className="px-3 py-2 text-left">Apellidos y Nombres</th>
                  {data.materias.map((m, i) => (
                    <th key={i} className="px-2 py-2 text-center text-xs max-w-[60px]" title={m.nombre}>
                      {m.nombre.slice(0, 4)}.
                    </th>
                  ))}
                  <th className="px-3 py-2 text-center">Prom.</th>
                  <th className="px-3 py-2 text-center">Escala</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.estudiantes.map(est => (
                  <tr key={est.codigo} className={est.posicion <= 3 ? 'bg-amber-50' : 'hover:bg-gray-50'}>
                    <td className="px-3 py-2 text-center text-base">
                      {est.posicion <= 3 ? MEDAL[est.posicion - 1] : est.posicion}
                    </td>
                    <td className="px-3 py-2 font-medium">
                      {est.apellido} {est.nombre}
                    </td>
                    {est.promedios_materia.map((nota, i) => (
                      <td key={i} className={`px-2 py-2 text-center text-xs ${nota <= 50 ? 'text-red-600 font-bold' : ''}`}>
                        {nota}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-center font-bold">{est.promedio_general}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badgeColor(est.escala_general)}`}>
                        {est.escala_general}
                      </span>
                    </td>
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
