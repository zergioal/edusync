import { useState, useEffect, useRef } from 'react'
import { api, ApiError } from '../../lib/api'
import { useToast } from '../ui/Toast'
import { Button, Spinner } from '@edusync/ui'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface RecreoPeriodo {
  despues_de_periodo: number
  duracion_min:       number
}

interface HorarioNivel {
  nivel_id:         string
  nivel:            { id: string; nombre: string }
  hora_inicio:      string
  minutos_lectura:  number
  max_periodos_dia: number
  recreos:          RecreoPeriodo[]
}

interface Turno {
  id:             string
  nombre:         string
  tipo:           string
  activo:         boolean
  horarios_nivel: HorarioNivel[]
}

interface ConfigData {
  duracion_periodo_min: number
  turnos:               Turno[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function addMinutes(hhmm: string, mins: number): string {
  const [h, m] = hhmm.split(':').map(Number)
  const total  = (h ?? 0) * 60 + (m ?? 0) + mins
  const hh = Math.floor(total / 60) % 24
  const mm = total % 60
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

interface Slot { label: string; hora: string; duracion: number; tipo: 'lectura' | 'periodo' | 'recreo' | 'fin' }

function computeSchedule(
  horaInicio:      string,
  minutosLectura:  number,
  duracionPeriodo: number,
  maxPeriodos:     number,
  recreos:         RecreoPeriodo[]
): Slot[] {
  const slots: Slot[] = []
  let hora = horaInicio

  if (minutosLectura > 0) {
    slots.push({ label: 'Lectura', hora, duracion: minutosLectura, tipo: 'lectura' })
    hora = addMinutes(hora, minutosLectura)
  }

  const recreoMap = new Map(recreos.map(r => [r.despues_de_periodo, r.duracion_min]))

  for (let p = 1; p <= maxPeriodos; p++) {
    slots.push({ label: `Período ${p}`, hora, duracion: duracionPeriodo, tipo: 'periodo' })
    hora = addMinutes(hora, duracionPeriodo)

    const rec = recreoMap.get(p)
    if (rec) {
      slots.push({ label: 'Recreo', hora, duracion: rec, tipo: 'recreo' })
      hora = addMinutes(hora, rec)
    }
  }

  slots.push({ label: 'Fin', hora, duracion: 0, tipo: 'fin' })
  return slots
}

// ─── Sub-componente: preview de horario ───────────────────────────────────────

function PreviewHorario({
  hn, duracionPeriodo,
}: { hn: HorarioNivel; duracionPeriodo: number }) {
  const slots = computeSchedule(
    hn.hora_inicio,
    hn.minutos_lectura,
    duracionPeriodo,
    hn.max_periodos_dia,
    hn.recreos,
  )

  const colorClass = (tipo: Slot['tipo']) => {
    if (tipo === 'lectura') return 'bg-indigo-50 text-indigo-700'
    if (tipo === 'recreo')  return 'bg-amber-50 text-amber-700'
    if (tipo === 'fin')     return 'bg-bg text-fg-muted font-semibold'
    return 'bg-surface text-fg'
  }

  return (
    <div className="mt-3 rounded-lg border border-border overflow-hidden">
      <div className="bg-bg px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-fg-muted">
        Vista previa — {hn.nivel.nombre}
      </div>
      <div className="divide-y divide-border max-h-52 overflow-y-auto">
        {slots.map((s, i) => (
          <div key={i} className={`flex items-center gap-3 px-3 py-1.5 text-sm ${colorClass(s.tipo)}`}>
            <span className="w-12 shrink-0 font-mono text-xs">{s.hora}</span>
            <span className="flex-1">{s.label}</span>
            {s.duracion > 0 && (
              <span className="text-xs text-fg-muted">{s.duracion} min</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Sub-componente: config de nivel dentro de un turno ──────────────────────

function NivelHorarioConfig({
  hn, duracionPeriodo, maxPeriodos,
  onChange,
}: {
  hn:              HorarioNivel
  duracionPeriodo: number
  maxPeriodos:     number
  onChange:        (updated: HorarioNivel) => void
}) {
  const [showPreview, setShowPreview] = useState(false)

  const update = (patch: Partial<HorarioNivel>) => onChange({ ...hn, ...patch })

  const setRecreo = (idx: number, field: keyof RecreoPeriodo, val: number) => {
    const recreos = hn.recreos.map((r, i) => i === idx ? { ...r, [field]: val } : r)
    update({ recreos })
  }

  const addRecreo = () => {
    const used = new Set(hn.recreos.map(r => r.despues_de_periodo))
    for (let p = 1; p <= maxPeriodos; p++) {
      if (!used.has(p)) {
        update({ recreos: [...hn.recreos, { despues_de_periodo: p, duracion_min: 20 }] })
        return
      }
    }
  }

  const removeRecreo = (idx: number) => update({ recreos: hn.recreos.filter((_, i) => i !== idx) })

  return (
    <div className="rounded-lg border border-border bg-bg p-4">
      <h4 className="mb-3 text-sm font-semibold text-fg">{hn.nivel.nombre}</h4>

      <div className="grid grid-cols-3 gap-3 mb-3">
        <div>
          <label className="block text-xs text-fg-muted mb-1">Hora inicio</label>
          <input
            type="time"
            value={hn.hora_inicio}
            onChange={e => update({ hora_inicio: e.target.value })}
            className="w-full rounded border border-border px-2 py-1.5 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>
        <div>
          <label className="block text-xs text-fg-muted mb-1">Lectura (min)</label>
          <input
            type="number" min={0} max={60}
            value={hn.minutos_lectura}
            onChange={e => update({ minutos_lectura: parseInt(e.target.value) || 0 })}
            className="w-full rounded border border-border px-2 py-1.5 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>
        <div>
          <label className="block text-xs text-fg-muted mb-1">Períodos/día</label>
          <input
            type="number" min={1} max={12}
            value={hn.max_periodos_dia}
            onChange={e => update({ max_periodos_dia: parseInt(e.target.value) || 1 })}
            className="w-full rounded border border-border px-2 py-1.5 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>
      </div>

      {/* Recreos */}
      <div className="mb-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-fg-muted">Recreos</span>
          {hn.recreos.length < maxPeriodos && (
            <button
              type="button"
              onClick={addRecreo}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              + Agregar recreo
            </button>
          )}
        </div>
        {hn.recreos.length === 0 && (
          <p className="text-xs text-fg-muted">Sin recreos configurados</p>
        )}
        {hn.recreos.map((r, i) => (
          <div key={i} className="flex items-center gap-2 mb-1.5">
            <span className="text-xs text-fg-muted shrink-0">Después del período</span>
            <input
              type="number" min={1} max={maxPeriodos}
              value={r.despues_de_periodo}
              onChange={e => setRecreo(i, 'despues_de_periodo', parseInt(e.target.value) || 1)}
              className="w-14 rounded border border-border px-2 py-1 text-xs focus:border-brand focus:outline-none"
            />
            <span className="text-xs text-fg-muted shrink-0">Duración</span>
            <input
              type="number" min={5} max={60}
              value={r.duracion_min}
              onChange={e => setRecreo(i, 'duracion_min', parseInt(e.target.value) || 5)}
              className="w-14 rounded border border-border px-2 py-1 text-xs focus:border-brand focus:outline-none"
            />
            <span className="text-xs text-fg-muted">min</span>
            <button
              type="button"
              onClick={() => removeRecreo(i)}
              className="ml-auto text-xs text-red-500 hover:text-red-700"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setShowPreview(v => !v)}
        className="text-xs text-blue-600 hover:text-blue-800 underline"
      >
        {showPreview ? 'Ocultar vista previa' : 'Ver vista previa'}
      </button>

      {showPreview && <PreviewHorario hn={hn} duracionPeriodo={duracionPeriodo} />}
    </div>
  )
}

// ─── Sección principal ─────────────────────────────────────────────────────────

/** Turnos y horarios por nivel — carga y guarda solo el campo `turnos` de
 *  /configuracion (payload parcial, el backend acepta actualizaciones parciales).
 *  Usado en Configuración (Admin) y en el panel de Director. */
export function SeccionTurnosHorarios() {
  const toast    = useToast()
  const toastRef = useRef(toast)
  toastRef.current = toast

  const [config,  setConfig]  = useState<ConfigData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [draft,   setDraft]   = useState<Turno[] | null>(null)

  useEffect(() => {
    api.get<ConfigData>('/configuracion')
      .then(data => { setConfig(data); setDraft(data.turnos) })
      .catch(() => toastRef.current.error('Error cargando configuración'))
      .finally(() => setLoading(false))
  }, [])

  const updateTurno = (turnoIdx: number, patch: Partial<Turno>) => {
    setDraft(prev => {
      if (!prev) return prev
      return prev.map((t, i) => i === turnoIdx ? { ...t, ...patch } : t)
    })
  }

  const updateHorarioNivel = (turnoIdx: number, nivelIdx: number, updated: HorarioNivel) => {
    setDraft(prev => {
      if (!prev) return prev
      return prev.map((t, ti) => {
        if (ti !== turnoIdx) return t
        const horarios_nivel = t.horarios_nivel.map((hn, hi) => hi === nivelIdx ? updated : hn)
        return { ...t, horarios_nivel }
      })
    })
  }

  const save = async () => {
    if (!draft) return
    setSaving(true)
    try {
      const updated = await api.put<ConfigData>('/configuracion', {
        turnos: draft.map(t => ({
          id:     t.id,
          activo: t.activo,
          horarios_nivel: t.horarios_nivel.map(hn => ({
            nivel_id:         hn.nivel_id,
            hora_inicio:      hn.hora_inicio,
            minutos_lectura:  hn.minutos_lectura,
            max_periodos_dia: hn.max_periodos_dia,
            recreos:          hn.recreos,
          })),
        })),
      })
      setConfig(updated)
      setDraft(updated.turnos)
      toastRef.current.success('Horarios guardados correctamente')
    } catch (err) {
      toastRef.current.error(err instanceof ApiError ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>

  if (!config || !draft) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center text-red-600">
        No se pudo cargar la configuración de horarios.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-fg-muted">
        Activa los turnos en uso y configura el horario para cada nivel educativo.
      </p>

      <div className="space-y-4">
        {draft.map((turno, ti) => (
          <div key={turno.id} className={`rounded-xl border-2 transition-colors ${
            turno.activo ? 'border-blue-200' : 'border-border'
          }`}>
            <div
              className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer ${
                turno.activo ? 'bg-blue-50 dark:bg-blue-950/30' : 'bg-bg'
              }`}
            >
              <input
                type="checkbox"
                id={`turno-${turno.id}`}
                checked={turno.activo}
                onChange={e => updateTurno(ti, { activo: e.target.checked })}
                className="h-4 w-4"
              />
              <label htmlFor={`turno-${turno.id}`} className="flex-1 cursor-pointer">
                <span className="font-semibold text-fg">{turno.nombre}</span>
                {!turno.activo && (
                  <span className="ml-2 text-xs text-fg-muted">inactivo</span>
                )}
              </label>
            </div>

            {turno.activo && turno.horarios_nivel.length > 0 && (
              <div className="px-4 pb-4 pt-2 grid gap-3">
                {turno.horarios_nivel.map((hn, hi) => (
                  <NivelHorarioConfig
                    key={hn.nivel_id}
                    hn={hn}
                    duracionPeriodo={config.duracion_periodo_min}
                    maxPeriodos={hn.max_periodos_dia}
                    onChange={updated => updateHorarioNivel(ti, hi, updated)}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-end pt-2">
        <Button onClick={save} loading={saving}>
          Guardar horarios
        </Button>
      </div>
    </div>
  )
}
