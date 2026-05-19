import { useState, useEffect, useRef, useCallback } from 'react'
import { api, ApiError } from '../../lib/api'
import { useToast } from '../../components/ui/Toast'
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

interface Nivel { id: string; nombre: string }

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
  turnos:               Turno[]
  niveles:              Nivel[]
  subareas_bth:         SubareaBTH[]
}

interface Grado    { id: string; nombre: string; orden: number }
interface Materia  {
  id:    string
  nombre: string
  campo: { nombre: string }
  carga_horaria: { grado: { id: string }; horas_mes: number }[]
}
interface CargaData { grados: Grado[]; materias: Materia[] }

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
    if (tipo === 'fin')     return 'bg-gray-50 text-gray-500 font-semibold'
    return 'bg-white text-gray-800'
  }

  return (
    <div className="mt-3 rounded-lg border border-gray-200 overflow-hidden">
      <div className="bg-gray-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
        Vista previa — {hn.nivel.nombre}
      </div>
      <div className="divide-y divide-gray-100 max-h-52 overflow-y-auto">
        {slots.map((s, i) => (
          <div key={i} className={`flex items-center gap-3 px-3 py-1.5 text-sm ${colorClass(s.tipo)}`}>
            <span className="w-12 shrink-0 font-mono text-xs">{s.hora}</span>
            <span className="flex-1">{s.label}</span>
            {s.duracion > 0 && (
              <span className="text-xs text-gray-400">{s.duracion} min</span>
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
    <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
      <h4 className="mb-3 text-sm font-semibold text-gray-700">{hn.nivel.nombre}</h4>

      <div className="grid grid-cols-3 gap-3 mb-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Hora inicio</label>
          <input
            type="time"
            value={hn.hora_inicio}
            onChange={e => update({ hora_inicio: e.target.value })}
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Lectura (min)</label>
          <input
            type="number" min={0} max={60}
            value={hn.minutos_lectura}
            onChange={e => update({ minutos_lectura: parseInt(e.target.value) || 0 })}
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Períodos/día</label>
          <input
            type="number" min={1} max={12}
            value={hn.max_periodos_dia}
            onChange={e => update({ max_periodos_dia: parseInt(e.target.value) || 1 })}
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Recreos */}
      <div className="mb-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-gray-500">Recreos</span>
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
          <p className="text-xs text-gray-400">Sin recreos configurados</p>
        )}
        {hn.recreos.map((r, i) => (
          <div key={i} className="flex items-center gap-2 mb-1.5">
            <span className="text-xs text-gray-500 shrink-0">Después del período</span>
            <input
              type="number" min={1} max={maxPeriodos}
              value={r.despues_de_periodo}
              onChange={e => setRecreo(i, 'despues_de_periodo', parseInt(e.target.value) || 1)}
              className="w-14 rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
            />
            <span className="text-xs text-gray-500 shrink-0">Duración</span>
            <input
              type="number" min={5} max={60}
              value={r.duracion_min}
              onChange={e => setRecreo(i, 'duracion_min', parseInt(e.target.value) || 5)}
              className="w-14 rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
            />
            <span className="text-xs text-gray-400">min</span>
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

// ─── Sub-componente: carga horaria por nivel ──────────────────────────────────

function SeccionCargaHoraria({ niveles }: { niveles: Nivel[] }) {
  const toast    = useToast()
  const toastRef = useRef(toast)
  toastRef.current = toast

  const [nivelId,    setNivelId]    = useState(niveles[0]?.id ?? '')
  const [carga,      setCarga]      = useState<CargaData | null>(null)
  const [loading,    setLoading]    = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [overrides,  setOverrides]  = useState<Record<string, Record<string, number>>>({})

  const load = useCallback(async (id: string) => {
    if (!id) return
    setLoading(true)
    setOverrides({})
    try {
      setCarga(await api.get<CargaData>(`/materias/carga-horaria?nivel_id=${id}`))
    } catch {
      toastRef.current.error('Error cargando carga horaria')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(nivelId) }, [nivelId, load])

  const getHoras = (materia_id: string, grado_id: string): number => {
    const ov = overrides[materia_id]?.[grado_id]
    if (ov !== undefined) return ov
    const mat = carga?.materias.find(m => m.id === materia_id)
    return mat?.carga_horaria.find(c => c.grado.id === grado_id)?.horas_mes ?? 0
  }

  const setHoras = (materia_id: string, grado_id: string, val: number) => {
    setOverrides(prev => ({
      ...prev,
      [materia_id]: { ...(prev[materia_id] ?? {}), [grado_id]: val },
    }))
  }

  const save = async () => {
    if (!carga) return
    const entries: { materia_id: string; grado_id: string; horas_mes: number }[] = []
    for (const mat of carga.materias) {
      for (const grado of carga.grados) {
        entries.push({ materia_id: mat.id, grado_id: grado.id, horas_mes: getHoras(mat.id, grado.id) })
      }
    }
    setSaving(true)
    try {
      await api.put('/materias/carga-horaria', entries)
      toastRef.current.success('Carga horaria guardada')
      setOverrides({})
      load(nivelId)
    } catch (err) {
      toastRef.current.error(err instanceof ApiError ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const hasChanges = Object.keys(overrides).length > 0

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        {niveles.map(n => (
          <button
            key={n.id}
            type="button"
            onClick={() => setNivelId(n.id)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              nivelId === n.id
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {n.nombre}
          </button>
        ))}
      </div>

      {loading && <div className="flex justify-center py-8"><Spinner /></div>}

      {!loading && carga && (
        <>
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="sticky left-0 bg-gray-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 min-w-[200px]">
                    Materia
                  </th>
                  {carga.grados.map(g => (
                    <th key={g.id} className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 min-w-[80px]">
                      {g.nombre}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {carga.materias.map(mat => (
                  <tr key={mat.id} className="hover:bg-gray-50">
                    <td className="sticky left-0 bg-white px-4 py-2.5 font-medium text-gray-800 hover:bg-gray-50">
                      <span>{mat.nombre}</span>
                      <span className="ml-2 text-xs text-gray-400">{mat.campo.nombre}</span>
                    </td>
                    {carga.grados.map(g => {
                      const h  = getHoras(mat.id, g.id)
                      const ov = overrides[mat.id]?.[g.id] !== undefined
                      return (
                        <td key={g.id} className="px-2 py-1.5 text-center">
                          <input
                            type="number" min={0} max={999}
                            value={h}
                            onChange={e => setHoras(mat.id, g.id, parseInt(e.target.value) || 0)}
                            className={`w-16 rounded border text-center text-sm px-1 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                              ov ? 'border-blue-400 bg-blue-50' : 'border-gray-200'
                            }`}
                          />
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end">
            <Button onClick={save} loading={saving} disabled={!hasChanges}>
              Guardar carga horaria
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function ConfiguracionPage() {
  const toast    = useToast()
  const toastRef = useRef(toast)
  toastRef.current = toast

  const [config,  setConfig]  = useState<ConfigData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [draft,   setDraft]   = useState<ConfigData | null>(null)

  useEffect(() => {
    api.get<ConfigData>('/configuracion')
      .then(data => { setConfig(data); setDraft(data) })
      .catch(() => toastRef.current.error('Error cargando configuración'))
      .finally(() => setLoading(false))
  }, [])

  const updateTurno = (turnoIdx: number, patch: Partial<Turno>) => {
    setDraft(prev => {
      if (!prev) return prev
      const turnos = prev.turnos.map((t, i) => i === turnoIdx ? { ...t, ...patch } : t)
      return { ...prev, turnos }
    })
  }

  const updateHorarioNivel = (turnoIdx: number, nivelIdx: number, updated: HorarioNivel) => {
    setDraft(prev => {
      if (!prev) return prev
      const turnos = prev.turnos.map((t, ti) => {
        if (ti !== turnoIdx) return t
        const horarios_nivel = t.horarios_nivel.map((hn, hi) => hi === nivelIdx ? updated : hn)
        return { ...t, horarios_nivel }
      })
      return { ...prev, turnos }
    })
  }

  const save = async () => {
    if (!draft) return
    setSaving(true)
    try {
      const updated = await api.put<ConfigData>('/configuracion', {
        tipo_ue:              draft.tipo_ue,
        carrera_tecnica:      draft.carrera_tecnica,
        duracion_periodo_min: draft.duracion_periodo_min,
        turnos: draft.turnos.map(t => ({
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
      setDraft(updated)
      toastRef.current.success('Configuración guardada correctamente')
    } catch (err) {
      toastRef.current.error(err instanceof ApiError ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="flex justify-center py-16"><Spinner /></div>
  }

  if (!draft) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center text-red-600">
        No se pudo cargar la configuración.
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
        <p className="text-sm text-gray-500 mt-0.5">Ajustes institucionales, horarios y carga académica</p>
      </div>

      {/* ── Sección 1: Tipo UE ──────────────────────────────────────────── */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-base font-semibold text-gray-800">Tipo de Unidad Educativa</h2>
        <div className="flex flex-wrap gap-4">
          {[
            { value: 'HUMANISTICA', label: 'Humanística', desc: 'Sin materias técnico-productivas' },
            { value: 'BTH',         label: 'Bachillerato Técnico Humanístico (BTH)', desc: 'Incluye TTG/TTE y materias técnicas' },
          ].map(opt => (
            <label
              key={opt.value}
              className={`flex flex-1 min-w-[220px] cursor-pointer items-start gap-3 rounded-lg border-2 p-4 transition-colors ${
                draft.tipo_ue === opt.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
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
                <p className="font-medium text-gray-900 text-sm">{opt.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </section>

      {/* ── Sección BTH: Bachillerato Técnico Humanístico ─────────────── */}
      {draft.tipo_ue === 'BTH' && (
        <section className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-6 shadow-sm space-y-5">
          <div>
            <h2 className="text-base font-semibold text-indigo-900">Bachillerato Técnico Humanístico (BTH)</h2>
            <p className="text-sm text-indigo-700/70 mt-0.5">Carrera técnica y sub-áreas de Técnica Tecnológica Especializada</p>
          </div>

          {/* Carrera técnica */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Carrera técnica de la institución</label>
            <input
              type="text"
              value={draft.carrera_tecnica ?? ''}
              onChange={e => setDraft(d => d ? { ...d, carrera_tecnica: e.target.value || null } : d)}
              placeholder="Ej: Administración de Empresas"
              className="w-full max-w-md rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Sub-áreas TTE */}
          {draft.subareas_bth.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Sub-áreas de Técnica Tecnológica Especializada (TTE)</p>
              <div className="rounded-lg border border-indigo-200 bg-white overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-indigo-50 text-left text-xs font-semibold uppercase tracking-wide text-indigo-700 border-b border-indigo-100">
                      <th className="px-4 py-2.5">Sub-área</th>
                      <th className="px-4 py-2.5 text-center">Horas/semana</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {draft.subareas_bth.map(sa => (
                      <tr key={sa.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 font-medium text-gray-800">{sa.nombre}</td>
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
              <p className="text-xs text-gray-400">Total: {draft.subareas_bth.reduce((s, a) => s + (a.horas_semanales ?? 0), 0)} horas/semana</p>
            </div>
          )}

          <div className="flex justify-end pt-1">
            <Button onClick={save} loading={saving}>
              Guardar configuración BTH
            </Button>
          </div>
        </section>
      )}

      {/* ── Sección 2: Duración del período ────────────────────────────── */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-3">
        <h2 className="text-base font-semibold text-gray-800">Duración del período pedagógico</h2>
        <div className="flex items-center gap-3">
          <input
            type="number" min={20} max={120}
            value={draft.duracion_periodo_min}
            onChange={e => setDraft(d => d ? { ...d, duracion_periodo_min: parseInt(e.target.value) || 40 } : d)}
            className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-600">minutos</span>
          <span className="text-xs text-gray-400">(recomendado: 40 o 45 min)</span>
        </div>
      </section>

      {/* ── Sección 3: Turnos y horarios por nivel ─────────────────────── */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-base font-semibold text-gray-800">Turnos y horarios por nivel</h2>
        <p className="text-sm text-gray-500">
          Activa los turnos en uso y configura el horario para cada nivel educativo.
        </p>

        <div className="space-y-4">
          {draft.turnos.map((turno, ti) => (
            <div key={turno.id} className={`rounded-xl border-2 transition-colors ${
              turno.activo ? 'border-blue-200' : 'border-gray-100'
            }`}>
              <div
                className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer ${
                  turno.activo ? 'bg-blue-50' : 'bg-gray-50'
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
                  <span className="font-semibold text-gray-800">{turno.nombre}</span>
                  {!turno.activo && (
                    <span className="ml-2 text-xs text-gray-400">inactivo</span>
                  )}
                </label>
              </div>

              {turno.activo && turno.horarios_nivel.length > 0 && (
                <div className="px-4 pb-4 pt-2 grid gap-3">
                  {turno.horarios_nivel.map((hn, hi) => (
                    <NivelHorarioConfig
                      key={hn.nivel_id}
                      hn={hn}
                      duracionPeriodo={draft.duracion_periodo_min}
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
            Guardar configuración institucional y horarios
          </Button>
        </div>
      </section>

      {/* ── Sección 4 (implícita en preview de cada nivel) ─────────────── */}

      {/* ── Sección 5: Carga horaria por nivel ─────────────────────────── */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <div>
          <h2 className="text-base font-semibold text-gray-800">Carga horaria por materia y grado</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Horas pedagógicas mensuales para cada materia según el grado. Los cambios afectan
            las asignaciones futuras.
          </p>
        </div>
        {draft.niveles.length > 0
          ? <SeccionCargaHoraria niveles={draft.niveles} />
          : <p className="text-sm text-gray-400">No hay niveles configurados.</p>
        }
      </section>
    </div>
  )
}
