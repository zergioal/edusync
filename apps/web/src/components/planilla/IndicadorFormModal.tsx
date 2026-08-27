import { useState } from 'react'
import { Instrumento } from '@edusync/types'
import { Button } from '@edusync/ui'
import { useToast } from '../ui/Toast'
import { ApiError } from '../../lib/api'

const INSTRUMENTO_LABELS: Record<string, string> = {
  OBSERVACION:        'Observación',
  CUADERNO:           'Cuaderno',
  EVALUACION_ESCRITA:  'Evaluación escrita',
  EVALUACION_ORAL:     'Evaluación oral',
  DEFENSA:             'Defensa',
  PIZARRA:             'Pizarra',
  OTRO:                'Otro',
}

export interface IndicadorFormValues {
  nombre:           string
  instrumento:      Instrumento
  instrumento_otro?: string
  fecha_aplicacion: string
  es_parcial:       boolean
}

interface IndicadorFormModalProps {
  mode:            'create' | 'edit'
  dimensionNombre: string
  dimensionMaxPts: number
  /** Si es true (indicador de Autoevaluación) solo se puede editar la fecha. */
  dateOnly?:       boolean
  initial?:        IndicadorFormValues
  onSubmit:        (data: Partial<IndicadorFormValues>) => Promise<void>
  onDelete?:       () => Promise<void>
  onClose:         () => void
}

const EMPTY: IndicadorFormValues = {
  nombre: '', instrumento: Instrumento.EVALUACION_ESCRITA, instrumento_otro: '', fecha_aplicacion: '', es_parcial: false,
}

export function IndicadorFormModal({
  mode, dimensionNombre, dimensionMaxPts, dateOnly, initial, onSubmit, onDelete, onClose,
}: IndicadorFormModalProps) {
  const toast = useToast()
  const [form,      setForm]      = useState<IndicadorFormValues>(initial ?? EMPTY)
  const [saving,    setSaving]    = useState(false)
  const [deleting,  setDeleting]  = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await onSubmit(dateOnly ? { fecha_aplicacion: form.fecha_aplicacion } : form)
      toast.success(mode === 'create' ? 'Indicador creado' : 'Indicador actualizado')
      onClose()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Error al guardar el indicador')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!onDelete) return
    if (!confirm(`¿Eliminar el indicador "${form.nombre}"? Solo se puede si no tiene notas registradas.`)) return
    setDeleting(true)
    try {
      await onDelete()
      toast.success('Indicador eliminado')
      onClose()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Error al eliminar')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-xl space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-base font-bold text-fg">
              {mode === 'create' ? 'Nuevo indicador' : 'Editar indicador'}
            </h2>
            <p className="text-xs text-fg-muted">{dimensionNombre} · máx {dimensionMaxPts} pts</p>
          </div>
          <button onClick={onClose} className="text-fg-muted hover:text-fg text-2xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {!dateOnly && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-fg-muted">Nombre</label>
              <input
                type="text"
                value={form.nombre}
                onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                placeholder="Ej: Examen parcial unidad 1"
                required
                autoFocus
                className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg focus:border-brand focus:outline-none"
              />
            </div>
          )}

          {!dateOnly && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-fg-muted">Instrumento</label>
              <select
                value={form.instrumento}
                onChange={e => setForm(f => ({ ...f, instrumento: e.target.value as Instrumento }))}
                className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg focus:border-brand focus:outline-none"
              >
                {Object.values(Instrumento).map(v => (
                  <option key={v} value={v}>{INSTRUMENTO_LABELS[v] ?? v}</option>
                ))}
              </select>
            </div>
          )}

          {!dateOnly && form.instrumento === Instrumento.OTRO && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-fg-muted">Nombre del instrumento</label>
              <input
                type="text"
                value={form.instrumento_otro ?? ''}
                onChange={e => setForm(f => ({ ...f, instrumento_otro: e.target.value }))}
                placeholder="Ej: Exposición grupal"
                required
                className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg focus:border-brand focus:outline-none"
              />
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-fg-muted">Fecha</label>
            <input
              type="date"
              value={form.fecha_aplicacion}
              onChange={e => setForm(f => ({ ...f, fecha_aplicacion: e.target.value }))}
              required
              autoFocus={dateOnly}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg focus:border-brand focus:outline-none"
            />
          </div>

          {!dateOnly && dimensionNombre === 'SABER' && (
            <label className="flex items-center gap-2 text-sm text-fg cursor-pointer">
              <input
                type="checkbox"
                checked={form.es_parcial}
                onChange={e => setForm(f => ({ ...f, es_parcial: e.target.checked }))}
                className="rounded border-border"
              />
              Parcial escrito
            </label>
          )}

          <div className="flex items-center gap-2 pt-1">
            {mode === 'edit' && onDelete && !dateOnly && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting || saving}
                className="text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-700 disabled:opacity-50"
              >
                {deleting ? 'Eliminando…' : 'Eliminar'}
              </button>
            )}
            <div className="flex-1" />
            <Button type="submit" size="sm" loading={saving}>
              {mode === 'create' ? 'Añadir' : 'Guardar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
