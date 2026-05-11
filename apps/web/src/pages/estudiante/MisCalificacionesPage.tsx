import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { PensionBlockModal } from '../../components/ui/PensionBlockModal'

type Escala = 'ED' | 'DA' | 'DO' | 'DP'

interface BoletinBase {
  tipo: 'REGULAR' | 'INICIAL'
  total_asistencias: number
  total_faltas:      number
  total_tardanzas:   number
}

interface BoletinRegular extends BoletinBase {
  tipo: 'REGULAR'
  dimensiones:      Array<{ nombre: string; puntaje_max: number; key: string }>
  materias:         Array<{ nombre: string; campo: string; ser: number; saber: number; hacer: number; autoevaluacion: number; total: number; escala: Escala; observacion: string | null }>
  promedio_general: number
  escala_general:   Escala
}

interface BoletinInicial extends BoletinBase {
  tipo: 'INICIAL'
  materias_inicial: Array<{ nombre: string; docente: string; observacion: string | null }>
}

type BoletinData = BoletinRegular | BoletinInicial

interface Trimestre { id: string; numero: number; cerrado: boolean; gestion_id: string }

function EscalaBadge({ e }: { e: Escala }) {
  const cls = e === 'ED' ? 'bg-red-100 text-red-700' : e === 'DA' ? 'bg-orange-100 text-orange-700' : e === 'DO' ? 'bg-green-100 text-green-600' : 'bg-emerald-100 text-emerald-700'
  return <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${cls}`}>{e}</span>
}

function ProgressBar({ value }: { value: number }) {
  const pct   = Math.min(100, value)
  const color = value <= 50 ? 'bg-red-400' : value <= 68 ? 'bg-orange-400' : value <= 84 ? 'bg-green-400' : 'bg-emerald-500'
  return (
    <div className="h-1.5 w-full rounded-full bg-gray-100 mt-1">
      <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

interface Props { estudianteId?: string }

export default function MisCalificacionesPage({ estudianteId }: Props) {
  const { estadoFinanciero } = useAuth()
  const [trimestres,   setTrimestres]   = useState<Trimestre[]>([])
  const [trimestreId,  setTrimestreId]  = useState('')
  const [gestionId,    setGestionId]    = useState('')
  const [data,         setData]         = useState<BoletinData | null>(null)
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState<string | null>(null)
  const [expandedCard, setExpandedCard] = useState<string | null>(null)

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
        <h1 className="text-xl font-bold text-gray-900">Mis Calificaciones</h1>
        {trimestres.length > 0 && (
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            {trimestres.map(t => (
              <button
                key={t.id}
                onClick={() => setTrimestreId(t.id)}
                className={`px-4 py-1.5 text-sm font-medium transition ${trimestreId === t.id ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                T{t.numero}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading && (
        <div className="rounded-xl border border-gray-100 bg-white p-10 text-center text-sm text-gray-400">
          Cargando calificaciones…
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-orange-50 border border-orange-200 p-4 text-sm text-orange-700">
          {error.includes('bloqueado') || error.includes('pendiente')
            ? '⚠️ El acceso al sistema académico está bloqueado por pensiones pendientes.'
            : error}
        </div>
      )}

      {/* REGULAR: grade cards */}
      {!loading && data?.tipo === 'REGULAR' && (
        <div className="space-y-4">
          {data.materias.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white p-10 text-center text-sm text-gray-400">
              Las calificaciones de este trimestre aún no están disponibles.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {data.materias.map(m => (
                  <div
                    key={m.nombre}
                    className="rounded-xl border border-gray-200 bg-white p-4 cursor-pointer hover:border-blue-300 transition"
                    onClick={() => setExpandedCard(expandedCard === m.nombre ? null : m.nombre)}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold text-gray-900 text-sm">{m.nombre}</div>
                        <div className="text-xs text-gray-400">{m.campo}</div>
                      </div>
                      <EscalaBadge e={m.escala} />
                    </div>
                    <div className="mt-3 grid grid-cols-5 gap-1 text-center text-xs text-gray-500">
                      {data.dimensiones.map(dim => (
                        <div key={dim.key}>
                          <div className="font-semibold text-gray-700 text-xs">{(m as unknown as Record<string, number>)[dim.key]}</div>
                          <div>{dim.nombre.slice(0, 3)}</div>
                        </div>
                      ))}
                      <div>
                        <div className="font-bold text-gray-900 text-sm">{m.total}</div>
                        <div>Total</div>
                      </div>
                    </div>
                    <ProgressBar value={m.total} />
                    {expandedCard === m.nombre && m.observacion && (
                      <div className="mt-3 rounded-lg bg-blue-50 p-2 text-xs text-blue-700">
                        <span className="font-medium">Observación: </span>{m.observacion}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-4 flex items-center justify-between">
                <div className="text-sm font-semibold text-gray-700">Promedio General del Trimestre</div>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold text-gray-900">{data.promedio_general}</span>
                  <EscalaBadge e={data.escala_general} />
                </div>
              </div>
              <p className="text-xs text-gray-400">Haz clic en una materia para ver la observación del docente.</p>
            </>
          )}
        </div>
      )}

      {/* INICIAL: qualitative observations */}
      {!loading && data?.tipo === 'INICIAL' && (
        <div className="space-y-4">
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
            Nivel Inicial — Evaluación cualitativa. Se muestran observaciones descriptivas del proceso de desarrollo.
          </div>
          {data.materias_inicial.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white p-10 text-center text-sm text-gray-400">
              Las observaciones de este trimestre aún no están disponibles.
            </div>
          ) : (
            data.materias_inicial.map(m => (
              <div key={m.nombre} className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="font-semibold text-gray-900">{m.nombre}</div>
                <div className="text-xs text-gray-400 mb-3">Doc. {m.docente}</div>
                {m.observacion ? (
                  <div className="rounded-lg bg-blue-50 border-l-4 border-blue-400 px-3 py-2 text-sm text-blue-800">
                    {m.observacion}
                  </div>
                ) : (
                  <div className="text-sm text-gray-400 italic">Sin observación registrada.</div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
