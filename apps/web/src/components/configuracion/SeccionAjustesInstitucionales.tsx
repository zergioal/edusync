import { useState, useEffect, useRef } from 'react'
import { api, ApiError } from '../../lib/api'
import { useToast } from '../ui/Toast'
import { Button, Spinner } from '@edusync/ui'

interface SubareaBTH {
  id:               string
  nombre:           string
  horas_semanales:  number | null
  es_subarea_de_id: string
  parent_materia:   { id: string; nombre: string } | null
}

interface ConfigData {
  tipo_ue:              string
  carrera_tecnica:      string | null
  duracion_periodo_min: number
  subareas_bth:         SubareaBTH[]
}

/** Ajustes institucionales: tipo de Unidad Educativa (Humanística/BTH), carrera
 *  técnica y duración del período pedagógico. Carga y guarda solo esos campos de
 *  /configuracion (payload parcial). Usado en Configuración (Admin) y en el
 *  panel de Director. */
export function SeccionAjustesInstitucionales() {
  const toast    = useToast()
  const toastRef = useRef(toast)
  toastRef.current = toast

  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [draft,   setDraft]   = useState<ConfigData | null>(null)

  useEffect(() => {
    api.get<ConfigData>('/configuracion')
      .then(setDraft)
      .catch(() => toastRef.current.error('Error cargando configuración'))
      .finally(() => setLoading(false))
  }, [])

  const save = async () => {
    if (!draft) return
    setSaving(true)
    try {
      const updated = await api.put<ConfigData>('/configuracion', {
        tipo_ue:              draft.tipo_ue,
        carrera_tecnica:      draft.carrera_tecnica,
        duracion_periodo_min: draft.duracion_periodo_min,
      })
      setDraft(updated)
      toastRef.current.success('Ajustes institucionales guardados')
    } catch (err) {
      toastRef.current.error(err instanceof ApiError ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>

  if (!draft) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center text-red-600">
        No se pudo cargar la configuración.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Tipo de UE */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-fg">Tipo de Unidad Educativa</h3>
        <div className="flex flex-wrap gap-4">
          {[
            { value: 'HUMANISTICA', label: 'Humanística', desc: 'Sin materias técnico-productivas' },
            { value: 'BTH',         label: 'Bachillerato Técnico Humanístico (BTH)', desc: 'Incluye TTG/TTE y materias técnicas' },
          ].map(opt => (
            <label
              key={opt.value}
              className={`flex flex-1 min-w-[220px] cursor-pointer items-start gap-3 rounded-lg border-2 p-4 transition-colors ${
                draft.tipo_ue === opt.value
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                  : 'border-border hover:border-border'
              }`}
            >
              <input
                type="radio"
                name="tipo_ue"
                value={opt.value}
                checked={draft.tipo_ue === opt.value}
                onChange={() => setDraft(d => d ? { ...d, tipo_ue: opt.value } : d)}
                className="mt-0.5"
              />
              <div>
                <p className="font-medium text-fg text-sm">{opt.label}</p>
                <p className="text-xs text-fg-muted mt-0.5">{opt.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </section>

      {/* BTH */}
      {draft.tipo_ue === 'BTH' && (
        <section className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-indigo-900">Bachillerato Técnico Humanístico (BTH)</h3>
            <p className="text-xs text-indigo-700/70 mt-0.5">Carrera técnica y sub-áreas de Técnica Tecnológica Especializada</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-fg">Carrera técnica de la institución</label>
            <input
              type="text"
              value={draft.carrera_tecnica ?? ''}
              onChange={e => setDraft(d => d ? { ...d, carrera_tecnica: e.target.value || null } : d)}
              placeholder="Ej: Administración de Empresas"
              className="w-full max-w-md rounded-lg border border-border px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {draft.subareas_bth.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-fg">Sub-áreas de Técnica Tecnológica Especializada (TTE)</p>
              <div className="rounded-lg border border-indigo-200 bg-surface overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-indigo-50 text-left text-xs font-semibold uppercase tracking-wide text-indigo-700 border-b border-indigo-100">
                      <th className="px-4 py-2.5">Sub-área</th>
                      <th className="px-4 py-2.5 text-center">Horas/semana</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {draft.subareas_bth.map(sa => (
                      <tr key={sa.id} className="hover:bg-surface-2">
                        <td className="px-4 py-2.5 font-medium text-fg">{sa.nombre}</td>
                        <td className="px-4 py-2.5 text-center">
                          <span className="inline-flex items-center justify-center h-6 w-10 rounded bg-indigo-100 text-indigo-700 text-xs font-semibold">
                            {sa.horas_semanales ?? '—'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-fg-muted">Total: {draft.subareas_bth.reduce((s, a) => s + (a.horas_semanales ?? 0), 0)} horas/semana</p>
            </div>
          )}
        </section>
      )}

      {/* Duración del período */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-fg">Duración del período pedagógico</h3>
        <div className="flex items-center gap-3">
          <input
            type="number" min={20} max={120}
            value={draft.duracion_periodo_min}
            onChange={e => setDraft(d => d ? { ...d, duracion_periodo_min: parseInt(e.target.value) || 40 } : d)}
            className="w-24 rounded-lg border border-border px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand"
          />
          <span className="text-sm text-fg-muted">minutos</span>
          <span className="text-xs text-fg-muted">(recomendado: 40 o 45 min)</span>
        </div>
      </section>

      <div className="flex justify-end pt-1">
        <Button onClick={save} loading={saving}>
          Guardar ajustes institucionales
        </Button>
      </div>
    </div>
  )
}
