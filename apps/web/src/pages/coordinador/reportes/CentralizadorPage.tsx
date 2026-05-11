import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api, apiDownload } from '../../../lib/api'
import { SelectGestion }   from '../../../components/select/SelectGestion'
import { SelectTrimestre } from '../../../components/select/SelectTrimestre'
import { SelectParalelo }  from '../../../components/select/SelectParalelo'

interface Materia { id: string; nombre: string; campo: string }
interface EstRow {
  nombre: string; apellido: string; codigo: string
  notas:  Record<string, { total: number | null }>
  promedio: number | null
}
interface Data {
  paralelo: string; grado: string; nivel: string; trimestre: number; anno: number
  materias: Materia[]
  estudiantes: EstRow[]
}

export default function CentralizadorPage() {
  const [gestionId,   setGestionId]   = useState('')
  const [trimestreId, setTrimestreId] = useState('')
  const [paraleloId,  setParaleloId]  = useState('')
  const [data,        setData]        = useState<Data | null>(null)
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [dlState,     setDlState]     = useState<'idle' | 'pdf' | 'xlsx'>('idle')

  async function generar() {
    if (!paraleloId || !trimestreId) return
    setLoading(true); setError(null)
    try {
      const res = await api.get<Data>(`/reportes/centralizador?paralelo_id=${paraleloId}&trimestre_id=${trimestreId}`)
      setData(res)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar')
    } finally { setLoading(false) }
  }

  async function descargar(tipo: 'pdf' | 'xlsx') {
    if (!paraleloId || !trimestreId || !data) return
    setDlState(tipo)
    try {
      const ext = tipo === 'pdf' ? 'pdf' : 'xlsx'
      await apiDownload(
        `/reportes/centralizador/${tipo}?paralelo_id=${paraleloId}&trimestre_id=${trimestreId}`,
        `centralizador_${data.grado}${data.paralelo}_T${data.trimestre}.${ext}`,
      )
    } finally { setDlState('idle') }
  }

  // Promedio del curso por materia
  const promediosCurso = data?.materias.map(m => {
    const vals = data.estudiantes.map(e => e.notas[m.id]?.total ?? null).filter((v): v is number => v !== null)
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link to=".." className="text-sm text-blue-600 hover:underline">← Reportes</Link>
        <h1 className="text-xl font-bold text-gray-900">📊 Centralizador de Notas</h1>
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
              {loading ? 'Generando…' : 'Generar vista'}
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
              <div className="text-sm text-gray-500">Trimestre {data.trimestre}° · Gestión {data.anno}</div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => descargar('pdf')}
                disabled={dlState !== 'idle'}
                className="rounded-lg border border-blue-600 px-3 py-1.5 text-sm text-blue-700 hover:bg-blue-50 disabled:opacity-50"
              >
                {dlState === 'pdf' ? '…' : '📄 PDF'}
              </button>
              <button
                onClick={() => descargar('xlsx')}
                disabled={dlState !== 'idle'}
                className="rounded-lg border border-green-600 px-3 py-1.5 text-sm text-green-700 hover:bg-green-50 disabled:opacity-50"
              >
                {dlState === 'xlsx' ? '…' : '📗 Excel'}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-xs">
              <thead>
                <tr className="bg-[#1F3864] text-white">
                  <th className="border border-blue-800 px-2 py-1.5 text-center w-8">N°</th>
                  <th className="border border-blue-800 px-3 py-1.5 text-left min-w-[140px]">Apellidos y Nombres</th>
                  {data.materias.map(m => (
                    <th key={m.id} className="border border-blue-800 px-1 py-1.5 text-center" title={m.nombre} style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', height: 70 }}>
                      {m.nombre}
                    </th>
                  ))}
                  <th className="border border-blue-800 px-2 py-1.5 text-center w-12">Prom.</th>
                </tr>
              </thead>
              <tbody>
                {data.estudiantes.map((est, idx) => (
                  <tr key={est.codigo} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="border border-gray-200 px-2 py-1 text-center text-gray-500">{idx + 1}</td>
                    <td className="border border-gray-200 px-3 py-1 font-medium">{est.apellido} {est.nombre}</td>
                    {data.materias.map(m => {
                      const total = est.notas[m.id]?.total ?? null
                      return (
                        <td key={m.id} className={`border border-gray-200 px-1 py-1 text-center ${total !== null && total <= 50 ? 'bg-red-100 text-red-700 font-bold' : ''}`}>
                          {total ?? '—'}
                        </td>
                      )
                    })}
                    <td className="border border-gray-200 px-2 py-1 text-center font-bold">{est.promedio ?? '—'}</td>
                  </tr>
                ))}
                {/* Promedio del curso */}
                <tr className="bg-blue-50 font-bold">
                  <td className="border border-gray-300 px-2 py-1 text-center">—</td>
                  <td className="border border-gray-300 px-3 py-1 text-[#1F3864]">Promedio del curso</td>
                  {(promediosCurso ?? []).map((p, i) => (
                    <td key={i} className="border border-gray-300 px-1 py-1 text-center text-[#1F3864]">{p ?? '—'}</td>
                  ))}
                  <td className="border border-gray-300 px-2 py-1 text-center text-[#1F3864]">
                    {(() => {
                      const vals = (promediosCurso ?? []).filter((v): v is number => v !== null)
                      return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : '—'
                    })()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400">Celdas rojas: nota ≤ 50 (ED). Escala: ED(0-50) DA(51-68) DO(69-84) DP(85-100)</p>
        </div>
      )}
    </div>
  )
}
