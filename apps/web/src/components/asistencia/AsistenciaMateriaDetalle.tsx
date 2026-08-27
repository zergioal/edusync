import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { Spinner } from '@edusync/ui'

type Estado = 'PRESENTE' | 'AUSENTE' | 'TARDANZA' | 'LICENCIA'

const DIA_ABREV = ['D', 'L', 'M', 'X', 'J', 'V', 'S']
const MESES_NOMBRES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const ESTADO_CFG = {
  PRESENTE: { bg: 'bg-emerald-500', text: 'text-white', label: 'P', title: 'Presente' },
  AUSENTE:  { bg: 'bg-red-500',     text: 'text-white', label: 'F', title: 'Falta'    },
  TARDANZA: { bg: 'bg-amber-400',   text: 'text-white', label: 'A', title: 'Atraso'   },
  LICENCIA: { bg: 'bg-blue-400',    text: 'text-white', label: 'L', title: 'Licencia' },
} as const

function hoyStr() { return new Date().toISOString().slice(0, 10) }
function mesStr(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` }
function mesLabel(m: string) {
  const [y, mo] = m.split('-')
  return `${MESES_NOMBRES[parseInt(mo!) - 1]} ${y}`
}

interface Props {
  asignacionId:  string
  materiaNombre: string
  estudianteId?: string
  onClose:       () => void
}

/** Calendario mensual de asistencia de clase — misma vista del docente, de solo lectura y para un único estudiante. */
export function AsistenciaMateriaDetalle({ asignacionId, materiaNombre, estudianteId, onClose }: Props) {
  const [mes,     setMes]     = useState(mesStr(new Date()))
  const [records, setRecords] = useState<Record<string, Estado>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const path = estudianteId
      ? `/asistencia/clase/mensual/hijo/${estudianteId}?asignacion_id=${asignacionId}&mes=${mes}`
      : `/asistencia/clase/mensual/mia?asignacion_id=${asignacionId}&mes=${mes}`
    api.get<{ records: Record<string, Estado> }>(path)
      .then(d => setRecords(d.records))
      .catch(() => setRecords({}))
      .finally(() => setLoading(false))
  }, [asignacionId, estudianteId, mes])

  const [yearN, monthN] = mes.split('-').map(Number)
  const daysInMonth = new Date(yearN!, monthN!, 0).getDate()
  const schoolDays: string[] = []
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(yearN!, monthN! - 1, d).getDay()
    if (dow !== 0) schoolDays.push(`${mes}-${String(d).padStart(2, '0')}`)
  }
  const today = hoyStr()

  function navMes(delta: number) {
    const [y, m] = mes.split('-').map(Number)
    setMes(mesStr(new Date(y!, m! - 1 + delta, 1)))
  }

  const totals = schoolDays.reduce(
    (acc, fecha) => {
      const e = records[fecha]
      if (e === 'PRESENTE') acc.p++
      else if (e === 'AUSENTE') acc.f++
      else if (e === 'TARDANZA') acc.t++
      else if (e === 'LICENCIA') acc.l++
      return acc
    },
    { p: 0, f: 0, t: 0, l: 0 },
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-surface p-6 shadow-xl space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-fg">Asistencia detallada</h2>
            <p className="text-sm text-fg-muted">{materiaNombre}</p>
          </div>
          <button onClick={onClose} className="text-fg-muted hover:text-fg text-2xl leading-none">×</button>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3 text-xs text-fg-muted flex-wrap">
            {(Object.entries(ESTADO_CFG) as [Estado, typeof ESTADO_CFG[Estado]][]).map(([, cfg]) => (
              <div key={cfg.label} className="flex items-center gap-1">
                <span className={`inline-flex w-5 h-5 rounded items-center justify-center text-[10px] font-bold ${cfg.bg} ${cfg.text}`}>
                  {cfg.label}
                </span>
                <span>{cfg.title}</span>
              </div>
            ))}
            <span className="text-fg-muted">· = Sin registro</span>
          </div>

          <div className="flex items-center gap-1 rounded-lg border border-border bg-surface shadow-sm overflow-hidden">
            <button onClick={() => navMes(-1)} className="px-3 py-1.5 text-fg-muted hover:bg-surface-2 text-lg leading-none">‹</button>
            <span className="px-3 py-1.5 text-sm font-semibold text-fg min-w-[120px] text-center">{mesLabel(mes)}</span>
            <button
              onClick={() => navMes(1)}
              disabled={mes >= mesStr(new Date())}
              className="px-3 py-1.5 text-fg-muted hover:bg-surface-2 disabled:opacity-30 text-lg leading-none"
            >›</button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border bg-surface">
            <table className="text-xs border-collapse" style={{ minWidth: `${160 + schoolDays.length * 34}px` }}>
              <thead>
                <tr className="bg-slate-50 border-b border-border">
                  <th className="sticky left-0 z-10 bg-slate-50 px-4 py-2 text-left text-xs font-semibold text-fg-muted border-r border-border w-32 min-w-[8rem]">
                    Día
                  </th>
                  {schoolDays.map(fecha => {
                    const d     = parseInt(fecha.slice(8))
                    const dow   = new Date(fecha).getDay()
                    const isSat = dow === 6
                    const isFut = fecha > today
                    return (
                      <th key={fecha} className={`w-8 border-r border-border ${isSat ? 'bg-slate-100' : ''}`}>
                        <div className="py-1 px-0.5 flex flex-col items-center gap-0 mx-auto" style={{ writingMode: 'vertical-lr', transform: 'rotate(180deg)' }}>
                          <span className={`font-bold ${isFut ? 'text-fg-muted' : 'text-fg'}`}>{d}</span>
                          <span className={isFut ? 'text-gray-200' : 'text-fg-muted'}>{DIA_ABREV[dow]}</span>
                        </div>
                      </th>
                    )
                  })}
                  <th className="border-l border-border bg-emerald-50 text-emerald-700 px-2 py-2 text-center">P</th>
                  <th className="border-l border-border bg-red-50    text-red-700    px-2 py-2 text-center">F</th>
                  <th className="border-l border-border bg-amber-50  text-amber-700  px-2 py-2 text-center">A</th>
                  <th className="border-l border-border bg-blue-50   text-blue-700   px-2 py-2 text-center">L</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border">
                  <td className="sticky left-0 z-10 bg-surface px-4 py-2 font-medium text-fg border-r border-border">
                    Estado
                  </td>
                  {schoolDays.map(fecha => {
                    const isFut  = fecha > today
                    const isSat  = new Date(fecha).getDay() === 6
                    const estado = records[fecha]
                    const cfg    = estado ? ESTADO_CFG[estado] : null
                    return (
                      <td key={fecha} className={`w-8 h-9 text-center border-r border-border ${isSat ? 'bg-slate-100/50' : ''}`}>
                        {isFut ? (
                          <span className="text-gray-200 text-xs">·</span>
                        ) : cfg ? (
                          <span className={`inline-flex w-7 h-7 items-center justify-center rounded font-bold ${cfg.bg} ${cfg.text}`} title={cfg.title}>
                            {cfg.label}
                          </span>
                        ) : (
                          <span className="text-fg-muted">·</span>
                        )}
                      </td>
                    )
                  })}
                  <td className="text-center px-2 font-bold text-emerald-700 bg-emerald-50/60 border-l border-border">{totals.p}</td>
                  <td className="text-center px-2 font-bold text-red-700     bg-red-50/60    border-l border-border">{totals.f}</td>
                  <td className="text-center px-2 font-bold text-amber-700   bg-amber-50/60  border-l border-border">{totals.t}</td>
                  <td className="text-center px-2 font-bold text-blue-700    bg-blue-50/60   border-l border-border">{totals.l}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
