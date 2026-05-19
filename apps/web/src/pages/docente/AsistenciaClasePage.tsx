import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { api, ApiError } from '../../lib/api'
import { useToast } from '../../components/ui/Toast'
import { Spinner } from '@edusync/ui'

type Estado = 'PRESENTE' | 'AUSENTE' | 'TARDANZA' | 'LICENCIA'

interface Estudiante {
  estudiante_id: string
  nombre:        string
  apellido:      string
}

interface AsignacionInfo {
  id:       string
  materia:  { nombre: string }
  paralelo: { id: string; letra: string; grado: { nombre: string } }
  gestion:  { id: string }
}

interface MensualData {
  estudiantes: Estudiante[]
  records:     Record<string, Record<string, string>>
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DIA_ABREV = ['D', 'L', 'M', 'X', 'J', 'V', 'S']
const MESES_NOMBRES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]

const ESTADO_CFG = {
  PRESENTE: { bg: 'bg-emerald-500', text: 'text-white', ring: 'ring-emerald-600', label: 'P', title: 'Presente'  },
  AUSENTE:  { bg: 'bg-red-500',     text: 'text-white', ring: 'ring-red-600',     label: 'F', title: 'Falta'     },
  TARDANZA: { bg: 'bg-amber-400',   text: 'text-white', ring: 'ring-amber-500',   label: 'T', title: 'Tardanza'  },
  LICENCIA: { bg: 'bg-blue-400',    text: 'text-white', ring: 'ring-blue-500',    label: 'L', title: 'Licencia'  },
} as const

// Cycle: empty → P → T → F → L → P
function nextEstado(cur: Estado | undefined): Estado {
  if (!cur || cur === 'LICENCIA') return 'PRESENTE'
  if (cur === 'PRESENTE') return 'TARDANZA'
  if (cur === 'TARDANZA') return 'AUSENTE'
  return 'LICENCIA'
}

function hoyStr() { return new Date().toISOString().slice(0, 10) }
function mesStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
function mesLabel(m: string) {
  const [y, mo] = m.split('-')
  return `${MESES_NOMBRES[parseInt(mo!) - 1]} ${y}`
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function AsistenciaClasePage() {
  const { asignacion_id } = useParams<{ asignacion_id: string }>()
  const toast    = useToast()
  const toastRef = useRef(toast)
  toastRef.current = toast

  const [asignacion,  setAsignacion]  = useState<AsignacionInfo | null>(null)
  const [mes,         setMes]         = useState<string>(mesStr(new Date()))
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([])
  // records[fecha][estudiante_id] = Estado
  const [records,     setRecords]     = useState<Record<string, Record<string, Estado>>>({})
  const [dirtyDays,   setDirtyDays]   = useState<Set<string>>(new Set())
  const [savingDays,  setSavingDays]  = useState<Set<string>>(new Set())
  const [loading,     setLoading]     = useState(true)
  const [loadingData, setLoadingData] = useState(false)

  // Load asignacion header once
  useEffect(() => {
    if (!asignacion_id) return
    api.get<AsignacionInfo>(`/asignaciones/${asignacion_id}`)
      .then(setAsignacion)
      .catch(() => toastRef.current.error('No se pudo cargar la asignación'))
      .finally(() => setLoading(false))
  }, [asignacion_id])

  // Load monthly data when mes changes
  const cargarMes = useCallback(async () => {
    if (!asignacion_id) return
    setLoadingData(true)
    setDirtyDays(new Set())
    try {
      const d = await api.get<MensualData>(
        `/asistencia/clase/mensual?asignacion_id=${asignacion_id}&mes=${mes}`,
      )
      setEstudiantes(d.estudiantes)
      const typed: Record<string, Record<string, Estado>> = {}
      for (const [fecha, dayRec] of Object.entries(d.records)) {
        typed[fecha] = {}
        for (const [estId, est] of Object.entries(dayRec)) {
          typed[fecha]![estId] = est as Estado
        }
      }
      setRecords(typed)
    } catch {
      toastRef.current.error('Error al cargar asistencia del mes')
    } finally {
      setLoadingData(false)
    }
  }, [asignacion_id, mes])

  useEffect(() => { cargarMes() }, [cargarMes])

  // ── Cell interaction ──────────────────────────────────────────────────────

  function clickCell(fecha: string, estudianteId: string) {
    const today = hoyStr()
    if (fecha > today) return
    setRecords(prev => {
      const dayRec = { ...(prev[fecha] ?? {}) }
      dayRec[estudianteId] = nextEstado(dayRec[estudianteId])
      return { ...prev, [fecha]: dayRec }
    })
    setDirtyDays(prev => new Set(prev).add(fecha))
  }

  function marcarColumna(fecha: string, estado: Estado) {
    setRecords(prev => {
      const dayRec: Record<string, Estado> = {}
      for (const est of estudiantes) dayRec[est.estudiante_id] = estado
      return { ...prev, [fecha]: dayRec }
    })
    setDirtyDays(prev => new Set(prev).add(fecha))
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  async function guardarDia(fecha: string) {
    if (!asignacion_id) return
    const dayRec = records[fecha] ?? {}
    const registros = Object.entries(dayRec).map(([estudiante_id, estado]) => ({ estudiante_id, estado }))
    if (registros.length === 0) return

    setSavingDays(prev => new Set(prev).add(fecha))
    try {
      await api.post('/asistencia/clase', { asignacion_id, fecha, registros })
    } catch (err) {
      toastRef.current.error(err instanceof ApiError ? err.message : `Error guardando ${fecha}`)
      throw err
    } finally {
      setSavingDays(prev => { const n = new Set(prev); n.delete(fecha); return n })
    }
  }

  async function guardarTodo() {
    const days = [...dirtyDays]
    if (days.length === 0) return
    try {
      await Promise.all(days.map(guardarDia))
      setDirtyDays(new Set())
      toastRef.current.success(`Asistencia guardada (${days.length} día${days.length > 1 ? 's' : ''})`)
    } catch {
      // individual errors already toasted
    }
  }

  // ── School days of month ──────────────────────────────────────────────────

  const [yearN, monthN] = mes.split('-').map(Number)
  const daysInMonth = new Date(yearN!, monthN!, 0).getDate()
  const schoolDays: string[] = []
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(yearN!, monthN! - 1, d).getDay()
    if (dow !== 0) {
      const fecha = `${mes}-${String(d).padStart(2, '0')}`
      schoolDays.push(fecha)
    }
  }
  const today = hoyStr()

  function navMes(delta: number) {
    const [y, m] = mes.split('-').map(Number)
    const d = new Date(y!, m! - 1 + delta, 1)
    setMes(mesStr(d))
  }

  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>

  const titulo = asignacion
    ? `${asignacion.materia.nombre} — ${asignacion.paralelo.grado.nombre} "${asignacion.paralelo.letra}"`
    : 'Asistencia de Clase'

  function studentTotals(estId: string) {
    let p = 0, f = 0, t = 0, l = 0
    for (const fecha of schoolDays) {
      if (fecha > today) continue
      const e = records[fecha]?.[estId]
      if (e === 'PRESENTE')  p++
      else if (e === 'AUSENTE')   f++
      else if (e === 'TARDANZA')  t++
      else if (e === 'LICENCIA')  l++
    }
    return { p, f, t, l }
  }

  const ESTADOS_COLUMNA: Estado[] = ['PRESENTE', 'TARDANZA', 'AUSENTE', 'LICENCIA']

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Asistencia de Clase</h1>
          <p className="text-sm text-gray-500 mt-0.5">{titulo}</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Month nav */}
          <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
            <button
              onClick={() => navMes(-1)}
              className="px-3 py-2 text-gray-500 hover:bg-gray-50 transition-colors text-lg leading-none"
            >‹</button>
            <span className="px-3 py-2 text-sm font-semibold text-gray-700 min-w-[130px] text-center">
              {mesLabel(mes)}
            </span>
            <button
              onClick={() => navMes(1)}
              disabled={mes >= mesStr(new Date())}
              className="px-3 py-2 text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition-colors text-lg leading-none"
            >›</button>
          </div>

          {/* Save button */}
          {dirtyDays.size > 0 && (
            <button
              onClick={guardarTodo}
              disabled={savingDays.size > 0}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors shadow-sm"
            >
              {savingDays.size > 0 ? '⏳ Guardando…' : `💾 Guardar cambios (${dirtyDays.size} día${dirtyDays.size > 1 ? 's' : ''})`}
            </button>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
        <span className="font-medium text-gray-600">Leyenda:</span>
        {(Object.entries(ESTADO_CFG) as [Estado, typeof ESTADO_CFG[Estado]][]).map(([, cfg]) => (
          <div key={cfg.label} className="flex items-center gap-1">
            <span className={`inline-flex w-5 h-5 rounded items-center justify-center text-[10px] font-bold ${cfg.bg} ${cfg.text}`}>
              {cfg.label}
            </span>
            <span>{cfg.title}</span>
          </div>
        ))}
        <span className="text-gray-400">· = Sin registro · Clic para cambiar</span>
      </div>

      {/* Table */}
      {loadingData
        ? <div className="flex justify-center py-16"><Spinner /></div>
        : estudiantes.length === 0
          ? <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white p-10 text-center text-sm text-gray-400">
              No hay estudiantes matriculados en este paralelo.
            </div>
          : (
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
              <table
                className="text-xs border-collapse"
                style={{ minWidth: `${240 + schoolDays.length * 34 + 140}px` }}
              >
                <thead>
                  {/* Date row */}
                  <tr className="bg-slate-50 border-b border-gray-200">
                    <th className="sticky left-0 z-10 bg-slate-50 px-4 py-2 text-left text-xs font-semibold text-gray-500 border-r border-gray-200 w-48 min-w-[12rem]">
                      Estudiante
                    </th>

                    {schoolDays.map(fecha => {
                      const d       = parseInt(fecha.slice(8))
                      const dow     = new Date(fecha).getDay()
                      const isSat   = dow === 6
                      const isFut   = fecha > today
                      const isDirty = dirtyDays.has(fecha)
                      const isSav   = savingDays.has(fecha)

                      return (
                        <th
                          key={fecha}
                          className={`w-8 border-r border-gray-100 relative ${isSat ? 'bg-slate-100' : ''} ${isDirty ? 'bg-amber-50' : ''}`}
                        >
                          <div
                            className="py-1 px-0.5 flex flex-col items-center gap-0 mx-auto"
                            style={{ writingMode: 'vertical-lr', transform: 'rotate(180deg)' }}
                          >
                            <span className={`font-bold ${isFut ? 'text-gray-300' : 'text-gray-700'}`}>{d}</span>
                            <span className={`${isFut ? 'text-gray-200' : 'text-gray-400'}`}>{DIA_ABREV[dow]}</span>
                          </div>
                          {isSav && (
                            <div className="absolute inset-0 bg-amber-100/70 flex items-center justify-center">
                              <span className="text-[8px] text-amber-700 font-bold" style={{ writingMode: 'vertical-lr' }}>...</span>
                            </div>
                          )}
                        </th>
                      )
                    })}

                    {/* Totals headers */}
                    <th className="border-l border-gray-200 bg-emerald-50 text-emerald-700 px-2 py-2 text-center">P</th>
                    <th className="border-l border-gray-100 bg-amber-50  text-amber-700  px-2 py-2 text-center">T</th>
                    <th className="border-l border-gray-100 bg-red-50    text-red-700    px-2 py-2 text-center">F</th>
                    <th className="border-l border-gray-100 bg-blue-50   text-blue-700   px-2 py-2 text-center">L</th>
                  </tr>

                  {/* "Mark all" row */}
                  <tr className="border-b border-gray-200 bg-gray-50/50">
                    <td className="sticky left-0 z-10 bg-gray-50 px-4 py-1 text-[10px] text-gray-400 font-medium border-r border-gray-200">
                      Marcar columna →
                    </td>
                    {schoolDays.map(fecha => {
                      const isFut = fecha > today
                      return (
                        <td key={fecha} className="border-r border-gray-100 text-center">
                          {!isFut && (
                            <div className="flex flex-col gap-px items-center py-0.5">
                              {ESTADOS_COLUMNA.map(e => (
                                <button
                                  key={e}
                                  onClick={() => marcarColumna(fecha, e)}
                                  title={`Todos: ${ESTADO_CFG[e].title}`}
                                  className={`w-4 h-2 rounded-sm transition-opacity hover:opacity-80 ${ESTADO_CFG[e].bg}`}
                                />
                              ))}
                            </div>
                          )}
                        </td>
                      )
                    })}
                    <td colSpan={4} className="border-l border-gray-200" />
                  </tr>
                </thead>

                <tbody>
                  {estudiantes.map((est, idx) => {
                    const totals = studentTotals(est.estudiante_id)
                    return (
                      <tr
                        key={est.estudiante_id}
                        className={`border-b border-gray-100 hover:bg-blue-50/30 transition-colors ${idx % 2 === 0 ? '' : 'bg-slate-50/30'}`}
                      >
                        {/* Name (sticky) */}
                        <td className={`sticky left-0 z-10 px-4 py-2 font-medium text-gray-800 border-r border-gray-200 whitespace-nowrap ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/80'}`}>
                          <span className="text-gray-400 mr-1.5 text-[10px]">{idx + 1}.</span>
                          {est.apellido}, {est.nombre}
                        </td>

                        {/* Day cells */}
                        {schoolDays.map(fecha => {
                          const isFut  = fecha > today
                          const isSat  = new Date(fecha).getDay() === 6
                          const estado = records[fecha]?.[est.estudiante_id]
                          const cfg    = estado ? ESTADO_CFG[estado] : null

                          return (
                            <td
                              key={fecha}
                              className={`w-8 h-9 text-center border-r border-gray-100 ${isSat ? 'bg-slate-100/50' : ''}`}
                            >
                              {isFut ? (
                                <span className="text-gray-200 text-xs">·</span>
                              ) : (
                                <button
                                  onClick={() => clickCell(fecha, est.estudiante_id)}
                                  title={cfg ? cfg.title : '—'}
                                  className={`w-7 h-7 rounded font-bold transition-all hover:scale-110 active:scale-95 ${
                                    cfg
                                      ? `${cfg.bg} ${cfg.text}`
                                      : 'text-gray-300 hover:bg-gray-100 hover:text-gray-500'
                                  }`}
                                >
                                  {cfg ? cfg.label : '·'}
                                </button>
                              )}
                            </td>
                          )
                        })}

                        {/* Totals */}
                        <td className="text-center px-2 font-bold text-emerald-700 bg-emerald-50/60 border-l border-gray-200">{totals.p}</td>
                        <td className="text-center px-2 font-bold text-amber-700   bg-amber-50/60  border-l border-gray-100">{totals.t}</td>
                        <td className="text-center px-2 font-bold text-red-700     bg-red-50/60    border-l border-gray-100">{totals.f}</td>
                        <td className="text-center px-2 font-bold text-blue-700    bg-blue-50/60   border-l border-gray-100">{totals.l}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )
      }
    </div>
  )
}
