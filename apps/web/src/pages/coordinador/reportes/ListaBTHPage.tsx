import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api, apiDownload } from '../../../lib/api'
import { useAuth } from '../../../context/AuthContext'
import { SelectGestion }  from '../../../components/select/SelectGestion'
import { SelectParalelo } from '../../../components/select/SelectParalelo'

interface EstudianteRow { codigo: string; apellido: string; nombre: string }
interface Resultado {
  curso: string
  cursan: EstudianteRow[]
  no_cursan: EstudianteRow[]
}

export default function ListaBTHPage() {
  const { user } = useAuth()
  const [gestionId,  setGestionId]  = useState('')
  const [paraleloId, setParaleloId] = useState('')
  const [data,       setData]       = useState<Resultado | null>(null)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [descargando, setDescargando] = useState<'pdf' | 'excel' | null>(null)

  async function generar() {
    if (!gestionId || !paraleloId) return
    setLoading(true); setError(null)
    try {
      const res = await api.get<Resultado>(`/reportes/bth/lista-tecnica?paralelo_id=${paraleloId}&gestion_id=${gestionId}`)
      setData(res)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar')
    } finally { setLoading(false) }
  }

  async function descargar(tipo: 'pdf' | 'excel') {
    setDescargando(tipo)
    try {
      await apiDownload(
        `/reportes/bth/lista-tecnica/${tipo}?paralelo_id=${paraleloId}&gestion_id=${gestionId}`,
        `lista_tecnica_bth.${tipo === 'pdf' ? 'pdf' : 'xlsx'}`,
      )
    } finally { setDescargando(null) }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link to=".." className="text-sm text-blue-600 hover:underline">← Reportes</Link>
        <h1 className="text-xl font-bold text-fg">Estudiantes que cursan / no cursan BTH</h1>
      </div>

      <div className="rounded-xl border border-border bg-surface p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SelectGestion  value={gestionId}  onChange={id => { setGestionId(id); setData(null) }} />
          <SelectParalelo value={paraleloId} onChange={setParaleloId} nivelesPermitidos={['SECUNDARIA']} gradoOrdenes={[5, 6]} label="Curso (5to o 6to)" />
          <div className="flex items-end">
            <button
              onClick={generar}
              disabled={!gestionId || !paraleloId || loading}
              className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Generando…' : 'Generar'}
            </button>
          </div>
        </div>
      </div>

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {data && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="font-semibold text-fg">{data.curso}</div>
              <div className="text-sm text-fg-muted">
                {data.cursan.length} cursan BTH · {data.no_cursan.length} no cursan
              </div>
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-surface overflow-hidden">
              <div className="px-4 py-2.5 bg-green-50 dark:bg-green-950/30 border-b border-border text-sm font-semibold text-green-700 dark:text-green-400">
                Cursan BTH ({data.cursan.length})
              </div>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-border">
                  {data.cursan.map(e => (
                    <tr key={e.codigo}><td className="px-4 py-2">{e.apellido}, {e.nombre}</td></tr>
                  ))}
                  {data.cursan.length === 0 && <tr><td className="px-4 py-3 text-fg-muted text-center">Sin registros</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="rounded-xl border border-border bg-surface overflow-hidden">
              <div className="px-4 py-2.5 bg-surface-2 border-b border-border text-sm font-semibold text-fg-muted">
                No cursan BTH ({data.no_cursan.length})
              </div>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-border">
                  {data.no_cursan.map(e => (
                    <tr key={e.codigo}><td className="px-4 py-2">{e.apellido}, {e.nombre}</td></tr>
                  ))}
                  {data.no_cursan.length === 0 && <tr><td className="px-4 py-3 text-fg-muted text-center">Sin registros</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
