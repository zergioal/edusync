import { useState, useEffect } from 'react'
import { api, apiDownload } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { PensionBlockModal } from '../../components/ui/PensionBlockModal'

type Escala = 'ED' | 'DA' | 'DO' | 'DP'

interface BoletinBase {
  tipo: 'REGULAR' | 'INICIAL'
  institucion:   { nombre: string }
  estudiante:    { nombre: string; apellido: string; codigo: string; grado: string; paralelo: string; nivel: string; docente_asesor: string | null }
  gestion:       { anno: number }
  trimestre:     { numero: number }
  total_asistencias: number
  total_faltas:      number
  total_tardanzas:   number
}

interface BoletinRegular extends BoletinBase {
  tipo: 'REGULAR'
  dimensiones: Array<{ nombre: string; puntaje_max: number; key: string }>
  materias:    Array<{ nombre: string; campo: string; ser: number; saber: number; hacer: number; autoevaluacion: number; total: number; escala: Escala }>
  promedio_general: number
  escala_general:   Escala
}

interface BoletinInicial extends BoletinBase {
  tipo: 'INICIAL'
  materias_inicial: Array<{ nombre: string; docente: string; observacion: string | null }>
}

type BoletinData = BoletinRegular | BoletinInicial

interface Trimestre { id: string; numero: number; cerrado: boolean; gestion_id: string }

function escalaColor(e: Escala) {
  if (e === 'ED') return '#dc2626'
  if (e === 'DA') return '#ea580c'
  if (e === 'DO') return '#16a34a'
  return '#15803d'
}

interface Props { estudianteId?: string }

export default function MiBoletinPage({ estudianteId }: Props) {
  const { estadoFinanciero } = useAuth()
  const [gestionId,   setGestionId]   = useState('')
  const [trimestres,  setTrimestres]  = useState<Trimestre[]>([])
  const [trimestreId, setTrimestreId] = useState('')
  const [data,        setData]        = useState<BoletinData | null>(null)
  const [loading,     setLoading]     = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [error,       setError]       = useState<string | null>(null)

  const esSelfView = !estudianteId
  const estId = estudianteId ?? estadoFinanciero?.hijos?.[0]?.id

  useEffect(() => {
    api.get<{ id: string; trimestres: Trimestre[] }>('/gestiones/activa')
      .then(g => {
        setGestionId(g.id)
        setTrimestres(g.trimestres)
        const t = g.trimestres.find(t => !t.cerrado) ?? g.trimestres[g.trimestres.length - 1]
        if (t) setTrimestreId(t.id)
      }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!estId || !trimestreId) return
    setLoading(true); setError(null); setData(null)
    api.get<BoletinData>(`/boletines/${estId}?trimestre_id=${trimestreId}`)
      .then(setData)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Error al cargar'))
      .finally(() => setLoading(false))
  }, [estId, trimestreId])

  const trimActual  = trimestres.find(t => t.id === trimestreId)
  const pdfDisabled = !trimActual?.cerrado

  async function descargarPdf() {
    if (!estId || !trimestreId || !data) return
    setDownloading(true)
    try {
      const nombre = `${data.estudiante.apellido}_${data.estudiante.nombre}`.replace(/\s+/g, '_')
      await apiDownload(
        `/boletines/${estId}/pdf?trimestre_id=${trimestreId}`,
        `boletin_${nombre}_T${data.trimestre.numero}.pdf`,
      )
    } finally { setDownloading(false) }
  }

  if (esSelfView && estadoFinanciero?.bloqueado) {
    return (
      <PensionBlockModal
        deuda={estadoFinanciero.deuda_pendiente}
        qrUrl={estadoFinanciero.qr_pago_url ?? null}
        whatsapp={estadoFinanciero.whatsapp ?? null}
      />
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-gray-900">Mi Boletín</h1>
        {trimestres.length > 0 && (
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            {trimestres.map(t => (
              <button
                key={t.id}
                onClick={() => setTrimestreId(t.id)}
                className={`px-4 py-1.5 text-sm font-medium transition ${trimestreId === t.id ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                T{t.numero}{t.cerrado ? ' ✓' : ''}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading && <div className="rounded-xl bg-white p-10 text-center text-sm text-gray-400">Cargando…</div>}
      {error   && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {data && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-5">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <div className="font-bold text-lg text-[#1F3864]">{data.institucion.nombre}</div>
              <div className="text-sm font-semibold text-gray-600 mt-0.5">
                {data.tipo === 'INICIAL' ? 'Informe de Desarrollo Integral' : 'Boletín de Calificaciones'}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {data.estudiante.apellido} {data.estudiante.nombre} — {data.estudiante.nivel} {data.estudiante.grado} "{data.estudiante.paralelo}" — T{data.trimestre.numero}° — {data.gestion.anno}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <button
                onClick={descargarPdf}
                disabled={pdfDisabled || downloading}
                title={pdfDisabled ? 'Disponible al cerrar el trimestre' : 'Descargar PDF'}
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {downloading ? '…' : '📄 PDF'}
              </button>
              {pdfDisabled && (
                <span className="text-xs text-gray-400">Disponible al cerrar el trimestre</span>
              )}
            </div>
          </div>

          {/* REGULAR: grade table */}
          {data.tipo === 'REGULAR' && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-[#1F3864] text-white">
                      <th className="px-3 py-2 text-left">Materia</th>
                      {data.dimensiones.map(d => (
                        <th key={d.key} className="px-2 py-2 text-center text-xs">
                          {d.nombre.slice(0, 5)}<br/><span className="text-gray-300 font-normal">({d.puntaje_max})</span>
                        </th>
                      ))}
                      <th className="px-2 py-2 text-center font-bold">Total</th>
                      <th className="px-2 py-2 text-center">Escala</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.materias.map((m, idx) => (
                      <tr key={m.nombre} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-3 py-2">
                          <div className="font-medium">{m.nombre}</div>
                          <div className="text-xs text-gray-400">{m.campo}</div>
                        </td>
                        {data.dimensiones.map(d => (
                          <td key={d.key} className="px-2 py-2 text-center text-sm">
                            {(m as unknown as Record<string, number>)[d.key]}
                          </td>
                        ))}
                        <td className="px-2 py-2 text-center font-bold">{m.total}</td>
                        <td className="px-2 py-2 text-center">
                          <span className="text-xs font-bold" style={{ color: escalaColor(m.escala) }}>{m.escala}</span>
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-gray-100 font-bold">
                      <td className="px-3 py-2 text-[#1F3864]">PROMEDIO GENERAL</td>
                      {data.dimensiones.map(d => <td key={d.key}></td>)}
                      <td className="px-2 py-2 text-center text-lg text-[#1F3864]">{data.promedio_general}</td>
                      <td className="px-2 py-2 text-center">
                        <span className="text-sm font-bold" style={{ color: escalaColor(data.escala_general) }}>{data.escala_general}</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-400">Escala: ED(0-50) DA(51-68) DO(69-84) DP(85-100)</p>
            </>
          )}

          {/* INICIAL: qualitative report */}
          {data.tipo === 'INICIAL' && (
            <>
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
                Nivel Inicial — Evaluación cualitativa (Ley 070). Las observaciones describen el desarrollo integral del niño/a.
              </div>
              <div className="space-y-3">
                {data.materias_inicial.map(m => (
                  <div key={m.nombre} className="rounded-lg border border-gray-200 p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-semibold text-gray-900">{m.nombre}</div>
                        <div className="text-xs text-gray-400">Doc. {m.docente}</div>
                      </div>
                    </div>
                    {m.observacion ? (
                      <div className="rounded-lg bg-blue-50 border-l-4 border-blue-400 px-3 py-2 text-sm text-blue-800">
                        {m.observacion}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-400 italic">Sin observación registrada.</div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Asistencia (always shown) */}
          <div className="grid grid-cols-3 gap-3 text-center text-sm">
            <div className="rounded-lg bg-green-50 p-3">
              <div className="text-xl font-bold text-green-700">{data.total_asistencias}</div>
              <div className="text-green-600">Presentes</div>
            </div>
            <div className="rounded-lg bg-orange-50 p-3">
              <div className="text-xl font-bold text-orange-600">{data.total_tardanzas}</div>
              <div className="text-orange-500">Tardanzas</div>
            </div>
            <div className="rounded-lg bg-red-50 p-3">
              <div className="text-xl font-bold text-red-600">{data.total_faltas}</div>
              <div className="text-red-500">Faltas</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
