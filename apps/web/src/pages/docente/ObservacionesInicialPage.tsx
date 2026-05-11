import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api, ApiError } from '../../lib/api'
import { useToast } from '../../components/ui/Toast'
import { Button, Spinner } from '@edusync/ui'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Asignacion {
  id:          string
  gestion_id:  string
  paralelo_id: string
  materia:     { nombre: string; campo: { nombre: string } }
  paralelo:    { letra: string; grado: { nombre: string; nivel: { nombre: string } } }
  gestion:     { anno: number }
}

interface Trimestre {
  id:      string
  numero:  number
  cerrado: boolean
}

interface ObsEntry {
  estudiante_id: string
  estudiante:    { nombre: string; apellido: string; codigo: string }
  observacion:   { id: string; contenido: string } | null
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function ObservacionesInicialPage() {
  const { asignacion_id } = useParams<{ asignacion_id: string }>()
  const navigate = useNavigate()
  const toast    = useToast()
  const toastRef = useRef(toast)
  toastRef.current = toast

  const [asignacion,   setAsignacion]   = useState<Asignacion | null>(null)
  const [trimestres,   setTrimestres]   = useState<Trimestre[]>([])
  const [trimestreId,  setTrimestreId]  = useState('')
  const [entries,      setEntries]      = useState<ObsEntry[]>([])
  const [drafts,       setDrafts]       = useState<Record<string, string>>({})
  const [loadingInit,  setLoadingInit]  = useState(true)
  const [loadingObs,   setLoadingObs]   = useState(false)
  const [saving,       setSaving]       = useState(false)

  // ── Carga inicial: asignacion + trimestres ────────────────────────────────

  useEffect(() => {
    if (!asignacion_id) return
    Promise.all([
      api.get<Asignacion>(`/asignaciones/${asignacion_id}`),
    ]).then(([a]) => {
      setAsignacion(a)
      return api.get<Trimestre[]>(`/trimestres?gestion_id=${a.gestion_id}`)
    }).then(ts => {
      setTrimestres(ts)
      const active = ts.find(t => !t.cerrado) ?? ts[0]
      if (active) setTrimestreId(active.id)
    }).catch(() => toastRef.current.error('Error cargando datos'))
      .finally(() => setLoadingInit(false))
  }, [asignacion_id])

  // ── Carga observaciones al cambiar trimestre ──────────────────────────────

  const loadObs = useCallback(async (paraId: string, trimId: string) => {
    if (!paraId || !trimId) return
    setLoadingObs(true)
    try {
      const data = await api.get<ObsEntry[]>(
        `/inicial/observaciones?paralelo_id=${paraId}&trimestre_id=${trimId}`
      )
      setEntries(data)
      const initial: Record<string, string> = {}
      for (const e of data) initial[e.estudiante_id] = e.observacion?.contenido ?? ''
      setDrafts(initial)
    } catch {
      toastRef.current.error('Error cargando observaciones')
    } finally {
      setLoadingObs(false)
    }
  }, [])

  useEffect(() => {
    if (asignacion && trimestreId) {
      loadObs(asignacion.paralelo_id, trimestreId)
    }
  }, [asignacion, trimestreId, loadObs])

  // ── Guardar ───────────────────────────────────────────────────────────────

  const save = async () => {
    if (!asignacion || !trimestreId) return
    const payload = entries.map(e => ({
      estudiante_id: e.estudiante_id,
      trimestre_id:  trimestreId,
      contenido:     drafts[e.estudiante_id] ?? '',
    })).filter(e => e.contenido.trim().length > 0)

    setSaving(true)
    try {
      await api.put('/inicial/observaciones', payload)
      toastRef.current.success('Observaciones guardadas correctamente')
      loadObs(asignacion.paralelo_id, trimestreId)
    } catch (err) {
      toastRef.current.error(err instanceof ApiError ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const hasChanges = entries.some(e => {
    const original = e.observacion?.contenido ?? ''
    return (drafts[e.estudiante_id] ?? '') !== original
  })

  // ── Render ────────────────────────────────────────────────────────────────

  if (loadingInit) {
    return <div className="flex justify-center py-16"><Spinner /></div>
  }

  if (!asignacion) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center text-red-600">
        No se encontró la asignación.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <button
            onClick={() => navigate('/dashboard/docente/asignaciones')}
            className="mb-2 text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            ← Mis Materias
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Observaciones — Nivel Inicial</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {asignacion.materia.campo.nombre} · {asignacion.materia.nombre} ·{' '}
            {asignacion.paralelo.grado.nombre} "{asignacion.paralelo.letra}" · Gestión {asignacion.gestion.anno}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={() => loadObs(asignacion.paralelo_id, trimestreId)}
            disabled={loadingObs}
          >
            Recargar
          </Button>
          <Button onClick={save} loading={saving} disabled={!hasChanges}>
            Guardar observaciones
          </Button>
        </div>
      </div>

      {/* Selector de trimestre */}
      <div className="flex items-center gap-2 flex-wrap">
        {trimestres.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTrimestreId(t.id)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              trimestreId === t.id
                ? 'bg-amber-500 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t.numero}° Trimestre
            {t.cerrado && <span className="ml-1.5 text-xs opacity-75">(cerrado)</span>}
          </button>
        ))}
      </div>

      {/* Info sobre evaluación cualitativa */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-800">
        <strong>Evaluación cualitativa.</strong> En el Nivel Inicial (Ley 070), la evaluación es descriptiva.
        Registra observaciones del proceso de aprendizaje, actitudes y desarrollo de cada estudiante.
      </div>

      {/* Lista de estudiantes */}
      {loadingObs && <div className="flex justify-center py-8"><Spinner /></div>}

      {!loadingObs && entries.length === 0 && (
        <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white p-12 text-center">
          <p className="text-gray-400">
            No hay estudiantes matriculados en este paralelo para esta gestión.
          </p>
        </div>
      )}

      {!loadingObs && entries.length > 0 && (
        <div className="space-y-3">
          {entries.map((entry, i) => {
            const { estudiante, estudiante_id } = entry
            const draft    = drafts[estudiante_id] ?? ''
            const original = entry.observacion?.contenido ?? ''
            const changed  = draft !== original

            return (
              <div
                key={estudiante_id}
                className={`rounded-xl border bg-white p-5 shadow-sm transition-colors ${
                  changed ? 'border-amber-300' : 'border-gray-200'
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-700 shrink-0">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-semibold text-gray-900">
                      {estudiante.apellido}, {estudiante.nombre}
                    </p>
                    <p className="text-xs text-gray-400">Cód. {estudiante.codigo}</p>
                  </div>
                  {changed && (
                    <span className="ml-auto text-xs text-amber-600 font-medium">Sin guardar</span>
                  )}
                </div>
                <textarea
                  value={draft}
                  onChange={e => setDrafts(prev => ({ ...prev, [estudiante_id]: e.target.value }))}
                  rows={4}
                  placeholder="Registrar observación cualitativa del estudiante…"
                  className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
                />
              </div>
            )
          })}
        </div>
      )}

      {/* Footer save */}
      {!loadingObs && entries.length > 0 && (
        <div className="flex justify-end pt-2">
          <Button onClick={save} loading={saving} disabled={!hasChanges}>
            Guardar observaciones
          </Button>
        </div>
      )}
    </div>
  )
}
