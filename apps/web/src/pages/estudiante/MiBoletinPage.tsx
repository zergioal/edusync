import { useState, useEffect } from 'react'
import { api, apiDownload } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { useGestionActiva } from '../../hooks/useGestionActiva'
import { useIsMobile } from '../../hooks/useIsMobile'
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

function escalaColor(e: Escala) {
  if (e === 'ED') return '#f43f5e'
  if (e === 'DA') return '#f59e0b'
  if (e === 'DO') return '#3b82f6'
  return '#10b981'
}

const DIM_CARD_COLORS = [
  'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',
  'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
  'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
  'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400',
]

interface Props { estudianteId?: string }

export default function MiBoletinPage({ estudianteId }: Props) {
  const { estadoFinanciero } = useAuth()
  const { trimestres, trimestreActual } = useGestionActiva()
  const isMobile = useIsMobile()
  const [trimestreId, setTrimestreId] = useState('')
  const [data,        setData]        = useState<BoletinData | null>(null)
  const [loading,     setLoading]     = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [error,       setError]       = useState<string | null>(null)

  const esSelfView = !estudianteId
  const estId = estudianteId ?? estadoFinanciero?.hijos?.[0]?.id

  useEffect(() => {
    if (trimestreActual && !trimestreId) setTrimestreId(trimestreActual.id)
  }, [trimestreActual, trimestreId])

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
        <h1 className="text-xl font-bold text-fg">Mi Boletín</h1>
        {trimestres.length > 0 && (
          <div className="flex rounded-lg border border-border overflow-hidden">
            {trimestres.map(t => (
              <button
                key={t.id}
                onClick={() => setTrimestreId(t.id)}
                className={`px-4 py-1.5 text-sm font-medium transition ${trimestreId === t.id ? 'bg-brand text-brand-fg' : 'bg-surface text-fg-muted hover:bg-surface-2'}`}
              >
                T{t.numero}{t.cerrado ? ' ✓' : ''}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading && <div className="rounded-xl bg-surface p-10 text-center text-sm text-fg-muted">Cargando…</div>}
      {error   && <div className="rounded-lg bg-red-50 dark:bg-red-950/40 p-3 text-sm text-red-700 dark:text-red-400">{error}</div>}

      {data && (
        <div className="rounded-xl border border-border bg-surface p-4 sm:p-5 space-y-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="font-bold text-lg text-brand truncate">{data.institucion.nombre}</div>
              <div className="text-sm font-semibold text-fg-muted mt-0.5">
                {data.tipo === 'INICIAL' ? 'Informe de Desarrollo Integral' : 'Boletín de Calificaciones'}
              </div>
              <div className="text-xs text-fg-muted/80 mt-1">
                {data.estudiante.apellido} {data.estudiante.nombre} — {data.estudiante.nivel} {data.estudiante.grado} "{data.estudiante.paralelo}" — T{data.trimestre.numero}° — {data.gestion.anno}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              <button
                onClick={descargarPdf}
                disabled={pdfDisabled || downloading}
                title={pdfDisabled ? 'Disponible al cerrar el trimestre' : 'Descargar PDF'}
                className="rounded-lg bg-brand px-3 py-1.5 text-sm text-brand-fg hover:bg-brand-hover disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {downloading ? '…' : '📄 PDF'}
              </button>
              {pdfDisabled && (
                <span className="text-xs text-fg-muted hidden sm:inline">Disponible al cerrar el trimestre</span>
              )}
            </div>
          </div>

          {/* REGULAR: notas */}
          {data.tipo === 'REGULAR' && (
            <>
              {isMobile ? (
                /* ── Tarjetas por materia (móvil) — sin scroll horizontal ── */
                <div className="space-y-2.5">
                  {data.materias.map(m => (
                    <div key={m.nombre} className="rounded-xl border border-border p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-semibold text-fg text-sm truncate">{m.nombre}</div>
                          <div className="text-xs text-fg-muted">{m.campo}</div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-lg font-bold text-fg">{m.total}</span>
                          <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{ color: escalaColor(m.escala), backgroundColor: `${escalaColor(m.escala)}1a` }}>
                            {m.escala}
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-1.5">
                        {data.dimensiones.map((d, idx) => (
                          <div key={d.key} className={`rounded-lg px-2 py-1 flex items-center justify-between text-xs ${DIM_CARD_COLORS[idx] ?? 'bg-surface-2 text-fg-muted'}`}>
                            <span className="font-medium truncate">{d.nombre}</span>
                            <span className="font-bold">{(m as unknown as Record<string, number>)[d.key]}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  <div className="rounded-xl bg-slate-800 dark:bg-slate-900 text-white p-3 flex items-center justify-between">
                    <span className="text-sm font-semibold">Promedio general</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold">{data.promedio_general}</span>
                      <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{ color: escalaColor(data.escala_general), backgroundColor: `${escalaColor(data.escala_general)}33` }}>
                        {data.escala_general}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                /* ── Tabla oficial (desktop) ── */
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-[#1F3864] text-white">
                        <th className="px-3 py-2 text-left">Materia</th>
                        {data.dimensiones.map(d => (
                          <th key={d.key} className="px-2 py-2 text-center text-xs">
                            {d.nombre.slice(0, 5)}<br/><span className="text-fg-muted font-normal">({d.puntaje_max})</span>
                          </th>
                        ))}
                        <th className="px-2 py-2 text-center font-bold">Total</th>
                        <th className="px-2 py-2 text-center">Escala</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {data.materias.map((m, idx) => (
                        <tr key={m.nombre} className={idx % 2 === 0 ? 'bg-surface' : 'bg-surface-2/60'}>
                          <td className="px-3 py-2">
                            <div className="font-medium text-fg">{m.nombre}</div>
                            <div className="text-xs text-fg-muted">{m.campo}</div>
                          </td>
                          {data.dimensiones.map(d => (
                            <td key={d.key} className="px-2 py-2 text-center text-sm text-fg">
                              {(m as unknown as Record<string, number>)[d.key]}
                            </td>
                          ))}
                          <td className="px-2 py-2 text-center font-bold text-fg">{m.total}</td>
                          <td className="px-2 py-2 text-center">
                            <span className="text-xs font-bold" style={{ color: escalaColor(m.escala) }}>{m.escala}</span>
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-surface-2 font-bold">
                        <td className="px-3 py-2 text-brand">PROMEDIO GENERAL</td>
                        {data.dimensiones.map(d => <td key={d.key}></td>)}
                        <td className="px-2 py-2 text-center text-lg text-brand">{data.promedio_general}</td>
                        <td className="px-2 py-2 text-center">
                          <span className="text-sm font-bold" style={{ color: escalaColor(data.escala_general) }}>{data.escala_general}</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
              <p className="text-xs text-fg-muted">Escala: ED(0-50) DA(51-68) DO(69-84) DP(85-100)</p>
            </>
          )}

          {/* INICIAL: qualitative report */}
          {data.tipo === 'INICIAL' && (
            <>
              <div className="rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 p-3 text-sm text-amber-800 dark:text-amber-400">
                Nivel Inicial — Evaluación cualitativa (Ley 070). Las observaciones describen el desarrollo integral del niño/a.
              </div>
              <div className="space-y-3">
                {data.materias_inicial.map(m => (
                  <div key={m.nombre} className="rounded-lg border border-border p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-semibold text-fg">{m.nombre}</div>
                        <div className="text-xs text-fg-muted">Doc. {m.docente}</div>
                      </div>
                    </div>
                    {m.observacion ? (
                      <div className="rounded-lg bg-blue-50 dark:bg-blue-950/40 border-l-4 border-blue-400 dark:border-blue-600 px-3 py-2 text-sm text-blue-800 dark:text-blue-300">
                        {m.observacion}
                      </div>
                    ) : (
                      <div className="text-sm text-fg-muted italic">Sin observación registrada.</div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Asistencia (always shown) */}
          <div className="grid grid-cols-3 gap-3 text-center text-sm">
            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 p-3">
              <div className="text-xl font-bold text-emerald-700 dark:text-emerald-400">{data.total_asistencias}</div>
              <div className="text-emerald-600 dark:text-emerald-500">Presentes</div>
            </div>
            <div className="rounded-lg bg-orange-50 dark:bg-orange-950/30 p-3">
              <div className="text-xl font-bold text-orange-600 dark:text-orange-400">{data.total_tardanzas}</div>
              <div className="text-orange-500 dark:text-orange-400">Tardanzas</div>
            </div>
            <div className="rounded-lg bg-red-50 dark:bg-red-950/30 p-3">
              <div className="text-xl font-bold text-red-600 dark:text-red-400">{data.total_faltas}</div>
              <div className="text-red-500 dark:text-red-400">Faltas</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
