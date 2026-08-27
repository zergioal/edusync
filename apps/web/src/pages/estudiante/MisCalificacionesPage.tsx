import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { useGestionActiva } from '../../hooks/useGestionActiva'
import { PensionBlockModal } from '../../components/ui/PensionBlockModal'
import { PlanillaMateriaDetalle } from '../../components/planilla/PlanillaMateriaDetalle'
import type { DimensionPlanilla, EstudiantePlanilla } from '../../hooks/usePlanilla'

type Escala = 'ED' | 'DA' | 'DO' | 'DP'

interface MateriaPlanilla {
  asignacion_id: string
  materia:       { nombre: string; campo: string }
  observacion:   string | null
  dimensiones:   DimensionPlanilla[]
  estudiante:    EstudiantePlanilla | null
}

interface RespuestaRegular {
  tipo:     'REGULAR'
  materias: MateriaPlanilla[]
}

interface RespuestaInicial {
  tipo: 'INICIAL'
  materias_inicial: Array<{ nombre: string; docente: string; observacion: string | null }>
}

type Respuesta = RespuestaRegular | RespuestaInicial

function EscalaBadge({ e }: { e: Escala }) {
  const cls = e === 'ED' ? 'bg-red-100 text-red-700' : e === 'DA' ? 'bg-orange-100 text-orange-700' : e === 'DO' ? 'bg-green-100 text-green-600' : 'bg-emerald-100 text-emerald-700'
  return <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${cls}`}>{e}</span>
}

interface Props { estudianteId?: string }

export default function MisCalificacionesPage({ estudianteId }: Props) {
  const { estadoFinanciero } = useAuth()
  const { trimestres, trimestreActual } = useGestionActiva()
  const [trimestreId,     setTrimestreId]     = useState('')
  const [data,            setData]            = useState<Respuesta | null>(null)
  const [loading,         setLoading]         = useState(false)
  const [error,           setError]           = useState<string | null>(null)
  const [materiaAbierta,  setMateriaAbierta]  = useState<string | null>(null)

  const esSelfView = !estudianteId

  useEffect(() => {
    if (trimestreActual && !trimestreId) setTrimestreId(trimestreActual.id)
  }, [trimestreActual, trimestreId])

  useEffect(() => {
    if (!trimestreId) return
    setLoading(true); setError(null); setData(null)
    const path = estudianteId
      ? `/planilla/hijo/${estudianteId}?trimestre_id=${trimestreId}`
      : `/planilla/mia?trimestre_id=${trimestreId}`
    api.get<Respuesta>(path)
      .then(setData)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Error al cargar'))
      .finally(() => setLoading(false))
  }, [estudianteId, trimestreId])

  if (esSelfView && estadoFinanciero?.bloqueado) {
    return (
      <PensionBlockModal
        deuda={estadoFinanciero.deuda_pendiente}
        qrUrl={estadoFinanciero.qr_pago_url ?? null}
        whatsapp={estadoFinanciero.whatsapp ?? null}
      />
    )
  }

  const materiaSeleccionada = data?.tipo === 'REGULAR'
    ? data.materias.find(m => m.asignacion_id === materiaAbierta) ?? null
    : null

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-fg">Mis Calificaciones</h1>
        {trimestres.length > 0 && (
          <div className="flex rounded-lg border border-border overflow-hidden">
            {trimestres.map(t => (
              <button
                key={t.id}
                onClick={() => { setTrimestreId(t.id); setMateriaAbierta(null) }}
                className={`px-4 py-1.5 text-sm font-medium transition ${trimestreId === t.id ? 'bg-blue-600 text-white' : 'bg-surface text-fg-muted hover:bg-surface-2'}`}
              >
                T{t.numero}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading && (
        <div className="rounded-xl border border-border bg-surface p-10 text-center text-sm text-fg-muted">
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

      {/* REGULAR: tarjetas por materia → detalle tipo planilla */}
      {!loading && data?.tipo === 'REGULAR' && !materiaSeleccionada && (
        data.materias.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-border bg-surface p-10 text-center text-sm text-fg-muted">
            Las calificaciones de este trimestre aún no están disponibles.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {data.materias.map(m => (
              <div
                key={m.asignacion_id}
                className="rounded-xl border border-border bg-surface p-4 cursor-pointer hover:border-blue-300 transition"
                onClick={() => setMateriaAbierta(m.asignacion_id)}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold text-fg text-sm">{m.materia.nombre}</div>
                    <div className="text-xs text-fg-muted">{m.materia.campo}</div>
                  </div>
                  {m.estudiante?.escala && <EscalaBadge e={m.estudiante.escala} />}
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-2xl font-bold text-fg">{m.estudiante?.total ?? '—'}</span>
                  <span className="text-xs text-blue-600 font-medium">Ver planilla →</span>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Detalle de una materia — planilla completa (dimensión → indicador → nota) */}
      {!loading && materiaSeleccionada && (
        <div className="space-y-4">
          <button
            onClick={() => setMateriaAbierta(null)}
            className="text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            ← Volver a materias
          </button>
          <div>
            <h2 className="text-lg font-bold text-fg">{materiaSeleccionada.materia.nombre}</h2>
            <p className="text-sm text-fg-muted">{materiaSeleccionada.materia.campo}</p>
          </div>
          {materiaSeleccionada.observacion && (
            <div className="rounded-lg bg-blue-50 border-l-4 border-blue-400 px-3 py-2 text-sm text-blue-800">
              <span className="font-medium">Observación del docente: </span>{materiaSeleccionada.observacion}
            </div>
          )}
          <PlanillaMateriaDetalle
            dimensiones={materiaSeleccionada.dimensiones}
            estudiante={materiaSeleccionada.estudiante}
          />
        </div>
      )}

      {/* INICIAL: observaciones cualitativas */}
      {!loading && data?.tipo === 'INICIAL' && (
        <div className="space-y-4">
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
            Nivel Inicial — Evaluación cualitativa. Se muestran observaciones descriptivas del proceso de desarrollo.
          </div>
          {data.materias_inicial.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-border bg-surface p-10 text-center text-sm text-fg-muted">
              Las observaciones de este trimestre aún no están disponibles.
            </div>
          ) : (
            data.materias_inicial.map(m => (
              <div key={m.nombre} className="rounded-xl border border-border bg-surface p-4">
                <div className="font-semibold text-fg">{m.nombre}</div>
                <div className="text-xs text-fg-muted mb-3">Doc. {m.docente}</div>
                {m.observacion ? (
                  <div className="rounded-lg bg-blue-50 border-l-4 border-blue-400 px-3 py-2 text-sm text-blue-800">
                    {m.observacion}
                  </div>
                ) : (
                  <div className="text-sm text-fg-muted italic">Sin observación registrada.</div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
